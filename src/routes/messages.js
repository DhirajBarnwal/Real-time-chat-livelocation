
const express = require('express');
const router = express.Router();
const {
    getMessages,
    sendMessage,
    updateMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    pinMessage,
    unpinMessage
} = require('../controllers/messageController');
const { uploadFile } = require('../controllers/messageController');
const { uploadFile: uploadFileMiddleware, uploadAny } = require('../middleware/upload');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Channel messages - FIXED: Make sure getMessages is exported from controller
router.get('/channel/:channelId', getMessages);

// Message CRUD
router.post('/', sendMessage);
// Log incoming upload attempts (headers/content-type) then accept any form field name
const logUploadAttempt = (req, res, next) => {
    try {
        const ct = req.headers['content-type'] || '';
        console.log(`[upload] ${req.method} ${req.originalUrl} content-type=${ct}`);
    } catch (e) {}
    next();
};

router.post('/upload', logUploadAttempt, uploadAny, uploadFile);
router.put('/:id', updateMessage);
router.delete('/:id', deleteMessage);

// Reactions
router.post('/:id/reactions', addReaction);
router.delete('/:id/reactions/:emoji', removeReaction);

// Pin/Unpin
router.post('/:id/pin', pinMessage);
router.delete('/:id/pin', unpinMessage);

module.exports = router;
