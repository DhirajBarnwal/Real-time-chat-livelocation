const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    searchUsers,
    updateStatus,
    getUserWorkspaces
} = require('../controllers/userController');
const { uploadAvatar, changePassword } = require('../controllers/userController');
const { uploadAvatar: avatarUploadMiddleware } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/', getUsers);
router.get('/search', searchUsers);
router.get('/workspaces', getUserWorkspaces);
router.put('/status', updateStatus);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.post('/:id/avatar', avatarUploadMiddleware, uploadAvatar);
router.post('/:id/change-password', changePassword);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;