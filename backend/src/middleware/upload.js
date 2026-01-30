const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create subdirectory for each applicant
        const applicantId = req.params.applicantId || req.applicantId || 'temp';
        const dir = path.join(UPLOAD_DIR, String(applicantId));
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with original extension
        const uniqueSuffix = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${Date.now()}-${uniqueSuffix}-${safeName}`);
    }
});

// File filter - Accept PDF, images, and documents
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed. Allowed: PDF, JPEG, PNG, DOC, DOCX'), false);
    }
};

// Create multer upload instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
        files: 5 // Max 5 files at once
    }
});

// Helper to get file path
function getFilePath(applicantId, filename) {
    return path.join(UPLOAD_DIR, String(applicantId), filename);
}

// Helper to delete file
function deleteFile(applicantId, filename) {
    const filePath = getFilePath(applicantId, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
}

module.exports = {
    upload,
    UPLOAD_DIR,
    getFilePath,
    deleteFile
};
