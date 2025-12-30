const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const { uploadFile, uploadAvatar, uploadMultiple, uploadAny } = require('../middleware/upload');

// Simple diagnostic endpoint to inspect incoming multipart requests
// Accept any file field name to inspect what the client sends
router.post('/upload-check', (req, res, next) => {
    uploadAny(req, res, function (err) {
        if (err) {
            logger.debug('Debug upload-check multer error: ' + (err.message || err));
            return res.status(err.status || 500).json({ success: false, error: err.message || String(err) });
        }

        try {
            const files = req.files || (req.file ? [req.file] : []);
            const mapped = (files || []).map(f => ({ fieldname: f.fieldname, originalname: f.originalname, mimetype: f.mimetype, size: f.size }));

            logger.info(`Debug upload-check: headers content-type=${req.headers['content-type']}, files=${mapped.length}`);

            return res.status(200).json({
                success: true,
                message: 'Upload-check received',
                headers: req.headers,
                files: mapped,
                body: req.body || {}
            });
        } catch (e) {
            logger.error('Debug upload-check handler error: ' + e.message);
            return res.status(500).json({ success: false, error: e.message });
        }
    });
});

// Helpful GET to explain usage (so a simple browser visit doesn't show 404)
router.get('/upload-check', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'POST multipart/form-data to this endpoint with a file field. Example: curl -F "file=@/path/to/file.jpg" http://localhost:5000/api/debug/upload-check'
    });
});

module.exports = router;
