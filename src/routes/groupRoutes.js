const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');

// Authentication middleware (assuming you have this in middleware folder)
const { auth } = require('../middleware/auth');

// Create a new group
router.post('/create', auth, async (req, res) => {
    try {
        const { name, participants } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Group name is required' });
        }
        
        // Validate participants are user IDs
        const validParticipants = [];
        if (participants && Array.isArray(participants)) {
            // If participants are usernames, convert to user IDs
            for (const participant of participants) {
                if (typeof participant === 'string') {
                    const user = await User.findOne({ username: participant });
                    if (user) {
                        validParticipants.push(user._id);
                    }
                } else {
                    // If it's already an ID
                    validParticipants.push(participant);
                }
            }
        }
        
        // Create group
        const group = new Group({
            name,
            createdBy: req.user.id,
            participants: [req.user.id, ...validParticipants],
            admins: [req.user.id]
        });
        
        await group.save();
        
        // Populate data for response
        const populatedGroup = await Group.findById(group._id)
            .populate('participants', 'username email')
            .populate('admins', 'username')
            .populate('createdBy', 'username');
        
        res.status(201).json({
            message: 'Group created successfully',
            group: populatedGroup
        });
        
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's groups
router.get('/', auth, async (req, res) => {
    try {
        const groups = await Group.find({ 
            participants: req.user.id,
            isActive: true 
        })
        .populate('participants', 'username email status')
        .populate('admins', 'username')
        .populate('createdBy', 'username')
        .sort({ lastMessageAt: -1, updatedAt: -1 });
        
        res.json({ groups });
        
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get group details
router.get('/:groupId', auth, async (req, res) => {
    try {
        const group = await Group.findOne({
            _id: req.params.groupId,
            participants: req.user.id,
            isActive: true
        })
        .populate('participants', 'username email status lastSeen')
        .populate('admins', 'username')
        .populate('createdBy', 'username');
        
        if (!group) {
            return res.status(404).json({ error: 'Group not found or you are not a member' });
        }
        
        res.json({ group });
        
    } catch (error) {
        console.error('Get group details error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add members to group
router.post('/:groupId/add-members', auth, async (req, res) => {
    try {
        const { participants } = req.body;
        
        if (!participants || !Array.isArray(participants)) {
            return res.status(400).json({ error: 'Participants array is required' });
        }
        
        const group = await Group.findOne({
            _id: req.params.groupId,
            admins: req.user.id
        });
        
        if (!group) {
            return res.status(404).json({ error: 'Group not found or you are not an admin' });
        }
        
        // Convert usernames to user IDs
        const newParticipantIds = [];
        for (const participant of participants) {
            if (typeof participant === 'string') {
                const user = await User.findOne({ username: participant });
                if (user && !group.participants.includes(user._id)) {
                    newParticipantIds.push(user._id);
                }
            } else {
                // If it's already an ID
                if (!group.participants.includes(participant)) {
                    newParticipantIds.push(participant);
                }
            }
        }
        
        // Add new participants
        group.participants = [...group.participants, ...newParticipantIds];
        await group.save();
        
        const populatedGroup = await Group.findById(group._id)
            .populate('participants', 'username email');
        
        res.json({
            message: 'Members added successfully',
            group: populatedGroup
        });
        
    } catch (error) {
        console.error('Add members error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Leave group
router.post('/:groupId/leave', auth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        
        // Remove user from participants
        group.participants = group.participants.filter(
            participantId => participantId.toString() !== req.user.id
        );
        
        // Remove from admins if admin
        group.admins = group.admins.filter(
            adminId => adminId.toString() !== req.user.id
        );
        
        // If no participants left or only creator left, archive the group
        if (group.participants.length === 0 || 
            (group.participants.length === 1 && group.createdBy.toString() === req.user.id)) {
            group.isActive = false;
        }
        
        await group.save();
        
        res.json({ 
            message: 'Left group successfully',
            groupId: group._id 
        });
        
    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete group (admin only)
router.delete('/:groupId', auth, async (req, res) => {
    try {
        const group = await Group.findOne({
            _id: req.params.groupId,
            createdBy: req.user.id
        });
        
        if (!group) {
            return res.status(404).json({ 
                error: 'Group not found or you are not the creator' 
            });
        }
        
        group.isActive = false;
        await group.save();
        
        res.json({ 
            message: 'Group deleted successfully',
            groupId: group._id 
        });
        
    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;