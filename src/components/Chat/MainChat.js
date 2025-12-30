import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import ChatHeader from './ChatHeader';
import MessagesContainer from './MessagesContainer';
import InputArea from './InputArea';
import CreateGroupModal from '../Groups/CreateGroupModal';
import OnlineUsersList from '../Users/OnlineUsersList';
import { useSocket } from '../../utils/socket';
import { getUserGroups, uploadMessageFile } from '../../utils/api';

const MainChat = ({ user, onLogout, onUpdateProfile }) => {
  const [activeTab, setActiveTab] = useState('chats');
  const [currentGroup, setCurrentGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const socket = useSocket();

  // Load user's groups
  useEffect(() => {
    if (user) {
      loadUserGroups();
    }
  }, [user]);

  const loadUserGroups = async () => {
    try {
      const response = await getUserGroups();
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (socket) {
      socket.on('new_message', handleNewMessage);
      socket.on('new_group_message', handleNewGroupMessage);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stopped_typing', handleUserStoppedTyping);
      socket.on('group_created', handleGroupCreated);
      // Online users updates
      const handleOnlineList = (list) => {
        if (!list) return;
        if (Array.isArray(list) && list.length > 0 && typeof list[0] === 'string') {
          setOnlineUsers(list.map((u, i) => ({ userId: `u_${i}`, username: u })));
        } else if (Array.isArray(list)) {
          setOnlineUsers(list.map(u => ({ userId: u.userId || u._id || u.id || (u.username || ''), username: u.username || u })));
        }
      };
      socket.on('online_users_list', handleOnlineList);
      socket.on('online_users', handleOnlineList);

      // Receive group messages
      const handleGroupMessages = (payload) => {
        if (!payload || !payload.groupId) return;
        // Replace messages state with history
        setMessages(payload.messages || []);
      };
      socket.on('group_messages', handleGroupMessages);
      const handleChannelMessages = (payload) => {
        if (!payload || !payload.channel) return;
        setMessages(payload.messages || []);
      };
      socket.on('channel_messages', handleChannelMessages);

      try { socket.emit('get_online_users'); } catch(e) {}
      // Request general channel history initially
      try {
        socket.emit('get_channel_messages', { channel: 'general', limit: 200 });
      } catch(e) {}
      return () => {
        socket.off('new_message');
        socket.off('new_group_message');
        socket.off('user_typing');
        socket.off('user_stopped_typing');
        socket.off('group_created');
        socket.off('online_users_list');
        socket.off('online_users');
        socket.off('group_messages');
        socket.off('channel_messages');
      };
    }
  }, [socket]);

  // Listen for upload errors dispatched by InputArea and add a visible message
  useEffect(() => {
    const handler = (e) => {
      try {
        const info = e?.detail || {};
        const errMsg = info.message || 'Attachment upload failed';
        const fileName = info.fileName || '';
        const failedAttachment = info.file ? { file: info.file, fileName } : null;
        const newMessage = {
          _id: 'err_' + Date.now().toString(),
          content: `Upload failed${fileName ? `: ${fileName}` : ''} — ${errMsg}`,
          sender: { _id: user?._id, username: user?.username },
          timestamp: Date.now(),
          type: 'error',
          failedAttachment
        };
        setMessages(prev => [...prev, newMessage]);
      } catch (err) {
        console.debug('upload-error handler failed', err?.message || err);
      }
    };

    window.addEventListener('upload-error', handler);
    return () => window.removeEventListener('upload-error', handler);
  }, [user]);

  // Retry handler used by MessagesContainer
  const handleRetryUpload = async (messageId) => {
    const msg = messages.find(m => m._id === messageId);
    if (!msg || !msg.failedAttachment || !msg.failedAttachment.file) {
      return Promise.reject(new Error('No failed attachment to retry'));
    }

    const file = msg.failedAttachment.file;
    try {
      // Attempt to upload file again
      const resp = await uploadMessageFile(file);
      const meta = resp?.data || resp;

      // Prepare message payload to emit via socket
      const messageData = {
        content: '',
        attachments: [] ,
        groupId: currentGroup?._id
      };
      if (meta) {
        messageData.attachments.push({ fileUrl: meta.fileUrl, fileName: meta.fileName, fileSize: meta.fileSize, fileType: meta.fileType });
      }

      // Emit via socket
      if (socket) {
        if (currentGroup) socket.emit('send_group_message', messageData);
        else socket.emit('send_message', messageData);
      }

      // Replace the error message with a success/info message
      setMessages(prev => prev.map(m => {
        if (m._id !== messageId) return m;
        return {
          _id: 'sent_' + Date.now().toString(),
          content: `Attachment sent: ${meta?.fileName || 'file'}`,
          sender: m.sender,
          timestamp: Date.now(),
          attachments: [{ fileUrl: meta.fileUrl, fileName: meta.fileName, fileSize: meta.fileSize, fileType: meta.fileType }]
        };
      }));

      return Promise.resolve();
    } catch (err) {
      console.error('Retry upload failed', err);
      return Promise.reject(err);
    }
  };

  const handleNewMessage = (message) => {
    if (!currentGroup) { // Only add to general chat
      setMessages(prev => [...prev, message]);
    }
  };

  const handleNewGroupMessage = (message) => {
    if (currentGroup && message.groupId === currentGroup._id) {
      setMessages(prev => [...prev, message]);
    }
  };

  const handleUserTyping = () => {
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  const handleUserStoppedTyping = () => {
    setIsTyping(false);
  };

  const handleGroupCreated = (group) => {
    setGroups(prev => [...prev, group]);
  };

  const joinGroup = (groupId) => {
    const group = groups.find(g => g._id === groupId);
    setCurrentGroup(group);
    setActiveTab('chats');
    setMessages([]); // Clear messages when switching groups
    if (socket && groupId) {
      try { socket.emit('join_group', { groupId }); } catch (e) { console.warn('join_group emit failed', e.message); }
    }
    // Request message history for this group
    if (socket && groupId) {
      try { socket.emit('get_group_messages', { groupId, limit: 200 }); } catch (e) { console.warn('get_group_messages failed', e.message); }
    }
  };

  // When switching back to general chat (no currentGroup), load channel history
  useEffect(() => {
    if (!socket) return;
    if (!currentGroup) {
      try { socket.emit('get_channel_messages', { channel: 'general', limit: 200 }); } catch (e) {}
    }
  }, [currentGroup, socket]);

  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const messageData = {
      content: inputMessage,
      groupId: currentGroup?._id
    };

    if (socket) {
      if (currentGroup) {
        socket.emit('send_group_message', messageData);
      } else {
        socket.emit('send_message', messageData);
      }
    }

    // Add message locally immediately
    const newMessage = {
      _id: Date.now().toString(),
      content: inputMessage,
      sender: {
        _id: user._id,
        username: user.username
      },
      timestamp: Date.now(),
      isYou: true
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
  };

  const handleCreateGroup = async (groupName, selectedUsers) => {
    try {
      if (!socket) throw new Error('Socket not connected');
      // selectedUsers is array of userIds
      socket.emit('create_group', { name: groupName, participants: selectedUsers });
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        groups={groups}
        currentGroup={currentGroup}
        joinGroup={joinGroup}
        setShowCreateGroupModal={setShowCreateGroupModal}
        onLogout={onLogout}
        onlineUsers={onlineUsers}
        onUpdateProfile={onUpdateProfile}
      />

      <div className="main-chat">
        <ChatHeader 
          currentGroup={currentGroup}
          isTyping={isTyping}
        />

        <MessagesContainer 
          messages={messages}
          currentUser={user}
          currentGroup={currentGroup}
          onRetryUpload={handleRetryUpload}
        />

       <InputArea
  inputMessage={inputMessage}
  setInputMessage={setInputMessage}
  sendMessage={sendMessage}
  currentGroup={currentGroup}
  currentUser={user}  // Add this line
/>
      </div>

      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreateGroup={handleCreateGroup}
        currentUser={user}
      />

      {activeTab === 'online' && (
        <OnlineUsersList currentUser={user} />
      )}
    </div>
  );
};

export default MainChat;