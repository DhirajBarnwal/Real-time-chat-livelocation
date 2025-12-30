const multer = require('multer');
const path = require('path');
const createError = require('http-errors');

// Set storage engine - using memory storage for multer v2
const storage = multer.memoryStorage();

// Check file type
const fileFilter = (req, file, cb) => {
    // Allowed extensions (include office, presentations, spreadsheets, video)
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp3|wav|ppt|pptx|xls|xlsx|csv|mp4|mov|webm/;
    
    // Check extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    // Check mime type loosely: accept image/video/audio/application/* and common office vendor types
    const mime = (file.mimetype || '').toLowerCase();
    const mimeAccept = /^(image\/|video\/|audio\/|application\/)/.test(mime) || /presentation|spreadsheet|wordprocessing|officedocument|msword|vnd\./.test(mime);

    if (extname || mimeAccept) {
        return cb(null, true);
    } else {
        cb(createError(400, 'Error: File type not supported!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

// Specific upload handlers
const uploadAvatar = upload.single('avatar');
const uploadFile = upload.single('file');
const uploadMultiple = upload.array('files', 5); // Max 5 files
const uploadAny = upload.any(); // accept any field name for diagnostics/flexibility

module.exports = {
    uploadAvatar,
    uploadFile,
    uploadMultiple,
    uploadAny
};