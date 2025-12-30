const logger = require('../config/logger');
const User = require('../models/User');
const Group = require('../models/Group');

// userId -> array of socketIds (multiple devices)
const userSockets = new Map();

// Store user data for quick access
const onlineUsers = new Map(); // userId -> { username, socketIds }

// Location tracking
const liveLocations = new Map(); // userId -> { location, shareUntil, groupId }
// Recent messages cache to prevent duplicate broadcasts
const recentMessages = new Map(); // key -> timestamp

module.exports = (io) => {
    io.on('connection', (socket) => {
        logger.info(`New socket connection: ${socket.id}`);
        
        // Store initial user info as undefined
        socket.userId = undefined;
        socket.username = undefined;
        
        // ===== DEBUG: Log all events =====
        socket.onAny((eventName, ...args) => {
            logger.debug(`📡 Event [${socket.id}]: ${eventName}`, args.length > 0 ? args[0] : '');
        });
        
        // ===== TEST MODE: Auto-authenticate for testing =====
        socket.on('test_auth', () => {
            socket.userId = "test_user_id_" + Date.now();
            socket.username = "TestUser";
            
            // Join general room
            socket.join('general');
            
            socket.emit('authenticated', {
                userId: socket.userId,
                username: socket.username,
                timestamp: Date.now()
            });
            
            logger.info(`✅ Test user authenticated: ${socket.username} (${socket.userId})`);
        });

        // User authentication
        socket.on('authenticate', async (token) => {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                const user = await User.findById(decoded.id);
                if (!user) {
                    socket.emit('auth_error', 'User not found');
                    return;
                }
                
                // Store user info
                socket.userId = user._id.toString();
                socket.username = user.username;
                
                // Update online users tracking
                if (!userSockets.has(socket.userId)) {
                    userSockets.set(socket.userId, []);
                    onlineUsers.set(socket.userId, {
                        userId: socket.userId,
                        username: socket.username,
                        socketIds: []
                    });
                }

                // Ensure userSockets entry exists
                if (!userSockets.get(socket.userId)) userSockets.set(socket.userId, []);
                userSockets.get(socket.userId).push(socket.id);

                // Ensure onlineUsers entry exists and has socketIds array
                let userData = onlineUsers.get(socket.userId);
                if (!userData) {
                    userData = {
                        userId: socket.userId,
                        username: socket.username,
                        socketIds: []
                    };
                    onlineUsers.set(socket.userId, userData);
                }
                if (!Array.isArray(userData.socketIds)) userData.socketIds = [];
                userData.socketIds.push(socket.id);
                
                // Update user status
                user.status = 'online';
                user.lastSeen = Date.now();
                await user.save();
                
                // Join user's personal room
                socket.join(`user:${socket.userId}`);
                
                // Join default general channel
                socket.join('general');
                
                // Load user's groups and join them
                const groups = await Group.find({ 
                    participants: socket.userId 
                }).populate('participants', 'username');
                
                groups.forEach(group => {
                    socket.join(`group:${group._id}`);
                });
                
                // Send groups to user
                socket.emit('user_groups', groups);
                
                // Emit online users (only usernames for privacy)
                const onlineUsernames = Array.from(onlineUsers.values()).map(u => u.username);
                io.emit('online_users', onlineUsernames);
                
                // Notify others that this user is online
                socket.broadcast.emit('user_online', {
                    userId: socket.userId,
                    username: socket.username,
                    timestamp: Date.now()
                });
                
                socket.emit('authenticated', {
                    userId: socket.userId,
                    username: socket.username,
                    timestamp: Date.now()
                });
                
                logger.info(`✅ User authenticated: ${socket.username} (${socket.userId})`);
                
            } catch (error) {
                logger.error(`❌ Authentication error: ${error.message}`);
                socket.emit('auth_error', 'Invalid token');
            }
        });

        // ===== DIRECT MESSAGING =====
        socket.on('send_direct_message', async (data) => {
            try {
                // Check authentication FIRST
                if (!socket.userId) {
                    socket.emit('message_error', 'Please authenticate first. Call authenticate() with JWT token.');
                    return;
                }
                
                const { toUserId, content, type = 'text', location } = data || {};

                if (!toUserId || (!content && type !== 'location')) {
                    socket.emit('message_error', 'Missing recipient or message content');
                    return;
                }
                
                const messageData = {
                    content: content || (type === 'location' ? '[location]' : ''),
                    type,
                    location: location || null,
                    sender: {
                        _id: socket.userId,
                        username: socket.username
                    },
                    recipient: toUserId,
                    timestamp: Date.now(),
                    _id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
                };
                
                logger.info(`📨 Direct message from ${socket.username} to ${toUserId}: ${content}`);
                
                // Emit to recipient's personal room
                io.to(`user:${toUserId}`).emit('new_direct_message', messageData);
                
                // Also emit back to sender for confirmation
                socket.emit('new_direct_message_sent', {
                    ...messageData,
                    sent: true
                });
                
            } catch (error) {
                logger.error(`❌ Direct message error: ${error.message}`);
                socket.emit('message_error', error.message);
            }
        });
        
        // ===== GENERAL CHAT MESSAGING =====
        socket.on('send_message', async (data) => {
            try {
                // CRITICAL: Check authentication FIRST
                if (!socket.userId) {
                    socket.emit('message_error', 'Please authenticate first. Call authenticate() with JWT token.');
                    return;
                }
                
                const { content, type = 'text', channel = 'general', attachments = [] } = data;
                
                if (!content) {
                    socket.emit('message_error', 'Message content required');
                    return;
                }
                
                const messageData = {
                    content,
                    type,
                    sender: {
                        _id: socket.userId,
                        username: socket.username
                    },
                    channel: channel,
                    timestamp: Date.now(),
                    attachments: attachments || [],
                    _id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
                };

                // Deduplicate: ignore identical messages from same sender to same channel within 1s
                try {
                    const dedupeKey = `${socket.userId}::${channel}::${content}`;
                    const now = Date.now();
                    const last = recentMessages.get(dedupeKey) || 0;
                    if (now - last < 1000) {
                        logger.warn(`⚠️ Duplicate message suppressed for ${socket.username}`);
                        return;
                    }
                    recentMessages.set(dedupeKey, now);
                    // Cleanup old entries periodically (lazy)
                    if (recentMessages.size > 1000) {
                        const cutoff = now - 5000;
                        for (const [k, t] of recentMessages) {
                            if (t < cutoff) recentMessages.delete(k);
                        }
                    }
                } catch (e) {
                    logger.warn('Dedupe check failed', e.message);
                }

                logger.info(`💬 Message to ${channel} by ${socket.username}: ${content}`);

                // Try to persist message when channel corresponds to a Channel document
                try {
                    const Message = require('../models/Message');
                    const Channel = require('../models/Channel');

                    let channelIdToUse = null;
                    // If channel looks like an ObjectId, try to use it
                    if (channel && typeof channel === 'string') {
                        // If channel equals 'general' or non-object id, try to find by name
                        if (channel === 'general') {
                            const ch = await Channel.findOne({ name: /general/i });
                            if (ch) channelIdToUse = ch._id;
                        } else if (/^[0-9a-fA-F]{24}$/.test(channel)) {
                            channelIdToUse = channel;
                        } else {
                            // try find by name
                            const ch = await Channel.findOne({ name: channel });
                            if (ch) channelIdToUse = ch._id;
                        }
                    }

                    if (channelIdToUse) {
                        // Persist text message if present
                        if (content && content.trim() !== '') {
                            await Message.create({
                                content,
                                sender: socket.userId,
                                channel: channelIdToUse,
                                type
                            });
                        }
                        // Persist attachments as separate messages
                        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
                            for (const att of attachments) {
                                try {
                                    await Message.create({
                                        content: att.fileName || '',
                                        sender: socket.userId,
                                        channel: channelIdToUse,
                                        type: (att.fileType && att.fileType.startsWith('image')) ? 'image' : 'file',
                                        fileUrl: att.fileUrl,
                                        fileName: att.fileName,
                                        fileSize: att.fileSize,
                                        fileType: att.fileType
                                    });
                                } catch (e) {
                                    logger.debug('Could not persist attachment message: ' + e.message);
                                }
                            }
                        }
                    }
                } catch (e) {
                    logger.debug('Could not persist channel message: ' + e.message);
                }

                // Emit to channel room
                io.to(channel).emit('new_message', messageData);
                
            } catch (error) {
                logger.error(`❌ Message sending error: ${error.message}`);
                socket.emit('message_error', error.message);
            }
        });

        // ===== JOIN ROOM =====
        socket.on('join_room', (data) => {
            if (!socket.userId) {
                socket.emit('auth_error', 'Not authenticated');
                return;
            }
            
            if (data && data.room) {
                socket.join(data.room);
                logger.info(`✅ User ${socket.username} joined room ${data.room}`);
                socket.emit('room_joined', { room: data.room });
            }
        });

        // ===== LOCATION SHARING FEATURES =====
        socket.on('share_location', (data) => {
            try {
                if (!socket.userId) {
                    socket.emit('location_error', 'Not authenticated');
                    return;
                }
                
                const { location, duration, shareUntil, groupId, recipientId } = data || {};

                // Store location (scoped)
                liveLocations.set(socket.userId, {
                    location,
                    shareUntil,
                    groupId,
                    recipientId: recipientId || null,
                    username: socket.username,
                    lastUpdated: Date.now()
                });

                // If sharing to a group, notify group members
                if (groupId) {
                    io.to(`group:${groupId}`).emit('user_sharing_location', {
                        userId: socket.userId,
                        username: socket.username,
                        location,
                        duration,
                        shareUntil
                    });
                }

                // If sharing directly to a recipient, emit to their personal room
                if (recipientId) {
                    io.to(`user:${recipientId}`).emit('user_sharing_location', {
                        userId: socket.userId,
                        username: socket.username,
                        location,
                        duration,
                        shareUntil
                    });
                }
                
                logger.info(`📍 User ${socket.username} started sharing location`);
                
            } catch (error) {
                logger.error(`❌ Location sharing error: ${error.message}`);
                socket.emit('location_error', error.message);
            }
        });

        socket.on('update_location', (data) => {
            try {
                if (!socket.userId) return;
                
                const { location, groupId } = data;
                
                if (liveLocations.has(socket.userId)) {
                    liveLocations.set(socket.userId, {
                        ...liveLocations.get(socket.userId),
                        location,
                        lastUpdated: Date.now()
                    });
                    
                    // Notify group
                    if (groupId) {
                        io.to(`group:${groupId}`).emit('location_updated', {
                            userId: socket.userId,
                            username: socket.username,
                            location,
                            timestamp: Date.now()
                        });
                    }
                }
            } catch (error) {
                logger.error(`❌ Location update error: ${error.message}`);
            }
        });

        socket.on('stop_sharing_location', (data) => {
            try {
                if (!socket.userId) return;
                
                const { groupId } = data;
                
                if (liveLocations.has(socket.userId)) {
                    liveLocations.delete(socket.userId);
                    
                    // Notify group
                    if (groupId) {
                        io.to(`group:${groupId}`).emit('location_sharing_stopped', {
                            userId: socket.userId,
                            username: socket.username
                        });
                    }
                }
                
                logger.info(`📍 User ${socket.username} stopped sharing location`);
            } catch (error) {
                logger.error(`❌ Stop location sharing error: ${error.message}`);
            }
        });

        // ===== GROUP FEATURES =====
        socket.on('create_group', async (data) => {
            try {
                if (!socket.userId) {
                    socket.emit('group_error', 'Not authenticated');
                    return;
                }
                
                const { name, participants } = data;
                
                if (!name || !participants || participants.length === 0) {
                    socket.emit('group_error', 'Group name and participants are required');
                    return;
                }
                
                // Validate participants exist
                const validParticipants = await User.find({
                    _id: { $in: participants }
                }).select('_id');
                
                if (validParticipants.length !== participants.length) {
                    socket.emit('group_error', 'One or more participants not found');
                    return;
                }
                
                // Create group in database
                const group = new Group({
                    name,
                    createdBy: socket.userId,
                    participants: [socket.userId, ...participants],
                    admins: [socket.userId]
                });
                
                await group.save();
                
                // Populate group data
                const populatedGroup = await Group.findById(group._id)
                    .populate('participants', 'username')
                    .populate('admins', 'username');
                
                // Join group room
                socket.join(`group:${group._id}`);
                
                // Notify all participants
                const allParticipants = [socket.userId, ...participants];
                allParticipants.forEach(participantId => {
                    io.to(`user:${participantId}`).emit('group_created', populatedGroup);
                });
                
                logger.info(`👥 Group created: ${name} by ${socket.username}`);
                
            } catch (error) {
                logger.error(`❌ Create group error: ${error.message}`);
                socket.emit('group_error', error.message);
            }
        });
        
        // Join group
        socket.on('join_group', async (data) => {
            try {
                if (!socket.userId) {
                    socket.emit('group_error', 'Not authenticated');
                    return;
                }
                
                const { groupId } = data;
                
                const group = await Group.findById(groupId);
                if (!group) {
                    socket.emit('group_error', 'Group not found');
                    return;
                }
                
                // Check if user is already a member
                const isMember = group.participants.some(
                    id => id.toString() === socket.userId
                );
                
                if (!isMember) {
                    // Add user to group
                    group.participants.push(socket.userId);
                    await group.save();
                }
                
                // Join group room
                socket.join(`group:${groupId}`);
                
                // Get updated group with populated participants
                const updatedGroup = await Group.findById(groupId)
                    .populate('participants', 'username');
                
                // Notify group members
                io.to(`group:${groupId}`).emit('user_joined_group', {
                    groupId,
                    userId: socket.userId,
                    username: socket.username,
                    timestamp: Date.now(),
                    group: updatedGroup
                });
                
                logger.info(`✅ User ${socket.username} joined group ${group.name}`);
                
            } catch (error) {
                logger.error(`❌ Join group error: ${error.message}`);
                socket.emit('group_error', error.message);
            }
        });
        
        // Leave group
        socket.on('leave_group', async (data) => {
            try {
                if (!socket.userId) {
                    socket.emit('group_error', 'Not authenticated');
                    return;
                }
                
                const { groupId } = data;
                
                const group = await Group.findById(groupId);
                if (!group) {
                    socket.emit('group_error', 'Group not found');
                    return;
                }
                
                // Remove user from group
                group.participants = group.participants.filter(
                    participantId => participantId.toString() !== socket.userId
                );
                
                // Remove from admins if admin
                group.admins = group.admins.filter(
                    adminId => adminId.toString() !== socket.userId
                );
                
                await group.save();
                
                // Leave group room
                socket.leave(`group:${groupId}`);
                
                // Get updated group
                const updatedGroup = await Group.findById(groupId)
                    .populate('participants', 'username');
                
                // Notify group members
                io.to(`group:${groupId}`).emit('user_left_group', {
                    groupId,
                    userId: socket.userId,
                    username: socket.username,
                    timestamp: Date.now(),
                    group: updatedGroup
                });
                
                socket.emit('group_left', { groupId });
                
                logger.info(`👋 User ${socket.username} left group ${group.name}`);
                
            } catch (error) {
                logger.error(`❌ Leave group error: ${error.message}`);
                socket.emit('group_error', error.message);
            }
        });
        
        // Send group message
        socket.on('send_group_message', async (data) => {
            try {
                if (!socket.userId) {
                    socket.emit('message_error', 'Not authenticated');
                    return;
                }
                
                const { groupId, content, type = 'text', attachments = [] } = data;

                if ((!content && (!attachments || attachments.length === 0)) || !groupId) {
                    socket.emit('message_error', 'Invalid message data');
                    return;
                }
                
                const group = await Group.findById(groupId);
                if (!group) {
                    socket.emit('message_error', 'Group not found');
                    return;
                }
                
                // Check if user is member of group
                const isMember = group.participants.some(
                    participantId => participantId.toString() === socket.userId
                );
                
                if (!isMember) {
                    socket.emit('message_error', 'You are not a member of this group');
                    return;
                }
                
                // Sanitize content: ensure stored lastMessage is always a string
                let contentToStore = content;
                let gmPayload = { type, sender: socket.userId, group: groupId };

                // If content is an object (e.g. location payload or accidental message object), handle it
                if (content && typeof content === 'object') {
                    // If it's a location-like object, store into location field and leave content as a placeholder
                    if (content.lat || content.lng || content.address) {
                        gmPayload.location = {
                            lat: content.lat,
                            lng: content.lng,
                            address: content.address,
                            expiresAt: content.expiresAt || null
                        };
                        contentToStore = '[location]';
                    } else if (content.content && typeof content.content === 'string') {
                        // If an inner message object was passed, prefer its content string
                        contentToStore = content.content;
                    } else {
                        // Fallback to a JSON string (safe) so schema cast does not fail
                        try {
                            contentToStore = JSON.stringify(content);
                        } catch (e) {
                            contentToStore = String(content);
                        }
                    }
                }

                const GroupMessage = require('../models/GroupMessage');

                const emittedMessages = [];

                // If there is text content, create a text GroupMessage
                if (contentToStore && typeof contentToStore === 'string' && contentToStore.trim() !== '') {
                    const textPayload = { ...gmPayload, content: contentToStore, type: 'text' };
                    const gmText = await GroupMessage.create(textPayload);
                    const populatedText = await GroupMessage.findById(gmText._id).populate('sender', 'username avatar');
                    const msg = { ...populatedText.toObject(), groupId, timestamp: populatedText.createdAt };
                    emittedMessages.push(msg);
                    io.to(`group:${groupId}`).emit('new_group_message', msg);
                }

                // If attachments present, create a GroupMessage per attachment
                if (attachments && Array.isArray(attachments) && attachments.length > 0) {
                    for (const att of attachments) {
                        try {
                            const attType = (att.fileType || '').startsWith('image') ? 'image' : 'file';
                            const filePayload = {
                                ...gmPayload,
                                type: attType,
                                fileUrl: att.fileUrl,
                                fileName: att.fileName,
                                fileSize: att.fileSize,
                                fileType: att.fileType
                            };
                            const gmFile = await GroupMessage.create(filePayload);
                            const populatedFile = await GroupMessage.findById(gmFile._id).populate('sender', 'username avatar');
                            const fmsg = { ...populatedFile.toObject(), groupId, timestamp: populatedFile.createdAt };
                            emittedMessages.push(fmsg);
                            io.to(`group:${groupId}`).emit('new_group_message', fmsg);
                        } catch (e) {
                            logger.error(`❌ Failed to persist attachment for group ${groupId}: ${e.message}`);
                        }
                    }
                }

                // Update group's last message (string) and timestamp — store a short summary
                let lastMessageText = '';
                if (contentToStore && typeof contentToStore === 'string' && contentToStore.trim() !== '') {
                    lastMessageText = contentToStore.substring(0, 120);
                } else if (attachments && attachments.length > 0) {
                    lastMessageText = `[${attachments.length} attachment${attachments.length > 1 ? 's' : ''}]`;
                } else {
                    lastMessageText = `[${type}]`;
                }
                group.lastMessage = lastMessageText;
                group.lastMessageAt = Date.now();
                await group.save();

                logger.info(`💬 Group message to ${group.name} by ${socket.username}: ${contentToStore || '[attachments]'}`);
                
            } catch (error) {
                logger.error(`❌ Group message error: ${error.message}`);
                socket.emit('message_error', error.message);
            }
        });
        
        // Typing indicator
        socket.on('typing', (data) => {
            try {
                if (!socket.userId) return;
                
                const { groupId, channel = 'general', recipientId } = data || {};
                
                if (groupId) {
                    // Group typing
                    socket.to(`group:${groupId}`).emit('user_typing', {
                        userId: socket.userId,
                        username: socket.username,
                        groupId,
                        timestamp: Date.now()
                    });
                } else if (recipientId) {
                    // Direct message typing
                    socket.to(`user:${recipientId}`).emit('user_typing', {
                        userId: socket.userId,
                        username: socket.username,
                        recipientId,
                        timestamp: Date.now()
                    });
                } else {
                    // General channel typing
                    socket.to('general').emit('user_typing', {
                        userId: socket.userId,
                        username: socket.username,
                        channel,
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                logger.error(`❌ Typing indicator error: ${error.message}`);
            }
        });
        
        // Stop typing
        socket.on('stop_typing', (data) => {
            try {
                if (!socket.userId) return;
                
                const { groupId, channel = 'general', recipientId } = data || {};
                
                if (groupId) {
                    socket.to(`group:${groupId}`).emit('user_stopped_typing', {
                        userId: socket.userId,
                        username: socket.username,
                        groupId
                    });
                } else if (recipientId) {
                    socket.to(`user:${recipientId}`).emit('user_stopped_typing', {
                        userId: socket.userId,
                        username: socket.username,
                        recipientId
                    });
                } else {
                    socket.to('general').emit('user_stopped_typing', {
                        userId: socket.userId,
                        username: socket.username,
                        channel
                    });
                }
            } catch (error) {
                logger.error(`❌ Stop typing error: ${error.message}`);
            }
        });
        
        // Get online users
        socket.on('get_online_users', () => {
            if (!socket.userId) {
                socket.emit('auth_error', 'Not authenticated');
                return;
            }
            
            const onlineUsersList = Array.from(onlineUsers.values()).map(u => ({
                userId: u.userId,
                username: u.username
            }));
            
            socket.emit('online_users_list', onlineUsersList);
        });

        // Get recent group messages
        socket.on('get_group_messages', async (data) => {
            try {
                if (!socket.userId) {
                    socket.emit('auth_error', 'Not authenticated');
                    return;
                }

                const { groupId, limit = 50 } = data || {};
                if (!groupId) {
                    socket.emit('group_messages', { groupId: null, messages: [] });
                    return;
                }

                const GroupMessage = require('../models/GroupMessage');
                const msgs = await GroupMessage.find({ group: groupId })
                    .populate('sender', 'username avatar')
                    .sort('-createdAt')
                    .limit(parseInt(limit));

                socket.emit('group_messages', { groupId, messages: msgs.reverse() });
            } catch (err) {
                logger.error('❌ get_group_messages error: ' + err.message);
                socket.emit('group_messages', { groupId: data && data.groupId, messages: [] });
            }
        });

        // Get recent channel messages
        socket.on('get_channel_messages', async (data) => {
            try {
                if (!socket.userId) {
                    socket.emit('auth_error', 'Not authenticated');
                    return;
                }

                const { channel, limit = 50 } = data || {};
                if (!channel) {
                    socket.emit('channel_messages', { channel: null, messages: [] });
                    return;
                }

                const Message = require('../models/Message');
                const Channel = require('../models/Channel');

                let channelId = null;
                if (typeof channel === 'string') {
                    if (/^[0-9a-fA-F]{24}$/.test(channel)) {
                        channelId = channel;
                    } else if (channel === 'general') {
                        const ch = await Channel.findOne({ name: /general/i });
                        if (ch) channelId = ch._id;
                    } else {
                        const ch = await Channel.findOne({ name: channel });
                        if (ch) channelId = ch._id;
                    }
                }

                if (!channelId) {
                    socket.emit('channel_messages', { channel: channel || null, messages: [] });
                    return;
                }

                const msgs = await Message.find({ channel: channelId })
                    .populate('sender', 'username avatar')
                    .sort('-createdAt')
                    .limit(parseInt(limit));

                socket.emit('channel_messages', { channel: channelId, messages: msgs.reverse() });
            } catch (err) {
                logger.error('❌ get_channel_messages error: ' + err.message);
                socket.emit('channel_messages', { channel: data && data.channel, messages: [] });
            }
        });
        
        // Disconnect
        socket.on('disconnect', async () => {
            if (socket.userId) {
                // Remove socket from user's sockets
                const userSocketArray = userSockets.get(socket.userId);
                if (userSocketArray) {
                    const index = userSocketArray.indexOf(socket.id);
                    if (index > -1) {
                        userSocketArray.splice(index, 1);
                    }
                    
                    // Update onlineUsers map
                    const userData = onlineUsers.get(socket.userId);
                    if (userData) {
                        const socketIndex = userData.socketIds.indexOf(socket.id);
                        if (socketIndex > -1) {
                            userData.socketIds.splice(socketIndex, 1);
                        }
                        
                        // If no more sockets for this user, mark as offline
                        if (userData.socketIds.length === 0) {
                            onlineUsers.delete(socket.userId);
                            
                            // Update user status in database
                            try {
                                const user = await User.findById(socket.userId);
                                if (user) {
                                    user.status = 'offline';
                                    user.lastSeen = Date.now();
                                    await user.save();
                                    
                                    // Emit user offline to all connected clients
                                    io.emit('user_offline', {
                                        userId: socket.userId,
                                        username: socket.username,
                                        timestamp: Date.now()
                                    });
                                    
                                    // Update online users list
                                    const updatedOnlineUsernames = Array.from(onlineUsers.values()).map(u => u.username);
                                    io.emit('online_users', updatedOnlineUsernames);
                                }
                            } catch (error) {
                                logger.error(`❌ Error updating user status: ${error.message}`);
                            }
                        }
                    }
                }
                
                logger.info(`👋 User ${socket.username} disconnected`);
            }
            
            logger.info(`🔌 Socket disconnected: ${socket.id}`);
        });
        
        // Error handling
        socket.on('error', (error) => {
            logger.error(`❌ Socket error: ${error.message}`);
        });
    });
    
    // Periodic cleanup and status update
    setInterval(() => {
        // Cleanup expired locations
        const now = Date.now();
        for (const [userId, locationData] of liveLocations) {
            if (now > locationData.shareUntil) {
                liveLocations.delete(userId);
                // Notify group that location sharing expired
                if (locationData.groupId) {
                    io.to(`group:${locationData.groupId}`).emit('location_sharing_expired', {
                        userId,
                        username: locationData.username
                    });
                }
            }
        }
        
        // Emit online users update
        const onlineUsersList = Array.from(onlineUsers.values()).map(u => ({
            userId: u.userId,
            username: u.username
        }));
        
        io.emit('online_users_update', onlineUsersList);
    }, 30000); // Every 30 seconds
    
    return {
        getOnlineUsers: () => Array.from(onlineUsers.values()),
        getUserSockets: (userId) => userSockets.get(userId) || [],
        isUserOnline: (userId) => onlineUsers.has(userId),
        getLiveLocations: () => Array.from(liveLocations.entries()).map(([userId, data]) => ({
            userId,
            ...data
        }))
    };
};