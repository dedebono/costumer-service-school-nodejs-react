const router = require('express').Router();
const path = require('path');
const { verifyToken, requireRole } = require('../middleware/auth');
const { upload, getFilePath } = require('../middleware/upload');
const {
    createUploadToken,
    getValidToken,
    markTokenUsed,
    getActiveTokenByApplicantId,
    invalidatePreviousTokens
} = require('../models/uploadToken');
const {
    getApplicantById,
    getApplicantDocuments,
    addApplicantDocument,
    updateDocumentStatus,
    getDocumentById,
    savePendingData,
    getPendingData,
    clearPendingData,
    approvePendingData,
    getApplicantDynamicDetails
} = require('../models/applicant');

// =====================================================
// PUBLIC ROUTES (No auth required - token-based access)
// =====================================================

/**
 * GET /api/parent-upload/:token
 * Validate token and return applicant data for editing
 */
router.get('/:token', async (req, res) => {
    try {
        const tokenData = await getValidToken(req.params.token);

        if (!tokenData) {
            return res.status(404).json({
                message: 'Link tidak valid atau sudah kadaluarsa',
                expired: true
            });
        }

        const applicant = await getApplicantById(tokenData.applicant_id);
        if (!applicant) {
            return res.status(404).json({ message: 'Data siswa tidak ditemukan' });
        }

        const documents = await getApplicantDocuments(tokenData.applicant_id);
        const dynamicDetails = await getApplicantDynamicDetails(tokenData.applicant_id);
        const pendingData = await getPendingData(tokenData.applicant_id);

        console.log('[PARENT-UPLOAD GET] Loading data for applicant:', tokenData.applicant_id);
        console.log('[PARENT-UPLOAD GET] Pending data:', pendingData);
        console.log('[PARENT-UPLOAD GET] Original address:', applicant.address);
        console.log('[PARENT-UPLOAD GET] Pending address:', pendingData?.data?.address);

        // Merge pending data with applicant data for display
        // If pending data exists, use it; otherwise use original applicant data
        const displayData = pendingData?.data ? {
            id: applicant.id,
            name: pendingData.data.name || applicant.name,
            nisn: pendingData.data.nisn || applicant.nisn,
            birthdate: pendingData.data.birthdate || applicant.birthdate,
            parent_phone: pendingData.data.parent_phone || applicant.parent_phone,
            email: pendingData.data.email || applicant.email,
            address: pendingData.data.address || applicant.address,
            notes: pendingData.data.notes || applicant.notes
        } : {
            id: applicant.id,
            name: applicant.name,
            nisn: applicant.nisn,
            birthdate: applicant.birthdate,
            parent_phone: applicant.parent_phone,
            email: applicant.email,
            address: applicant.address,
            notes: applicant.notes
        };

        res.json({
            applicant: displayData,
            documents,
            dynamicDetails,
            expires_at: tokenData.expires_at,
            hasPendingData: !!pendingData?.data,
            pendingSubmittedAt: pendingData?.submitted_at
        });
    } catch (e) {
        console.error('Error validating token:', e);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
});

/**
 * POST /api/parent-upload/:token/data
 * Save pending data changes (to be reviewed by admin)
 */
router.post('/:token/data', async (req, res) => {
    try {
        console.log('[PARENT-UPLOAD] Saving data for token:', req.params.token);
        const tokenData = await getValidToken(req.params.token);

        if (!tokenData) {
            console.log('[PARENT-UPLOAD] Token not valid or expired');
            return res.status(404).json({
                message: 'Link tidak valid atau sudah kadaluarsa',
                expired: true
            });
        }

        console.log('[PARENT-UPLOAD] Token valid for applicant:', tokenData.applicant_id);
        console.log('[PARENT-UPLOAD] Request body:', req.body);

        const { name, nisn, birthdate, parent_phone, email, address, notes } = req.body;

        // Save as pending data (not applied yet)
        const pendingDataToSave = { name, nisn, birthdate, parent_phone, email, address, notes };
        console.log('[PARENT-UPLOAD] Saving pending data:', pendingDataToSave);

        await savePendingData(tokenData.applicant_id, pendingDataToSave);
        console.log('[PARENT-UPLOAD] Pending data saved successfully!');

        res.json({
            ok: true,
            message: 'Data berhasil disimpan dan akan direview oleh petugas'
        });
    } catch (e) {
        console.error('[PARENT-UPLOAD] Error saving pending data:', e);
        res.status(500).json({ message: 'Gagal menyimpan data' });
    }
});

/**
 * POST /api/parent-upload/:token/upload
 * Upload document file
 */
router.post('/:token/upload', async (req, res) => {
    try {
        const tokenData = await getValidToken(req.params.token);

        if (!tokenData) {
            return res.status(404).json({
                message: 'Link tidak valid atau sudah kadaluarsa',
                expired: true
            });
        }

        // Set applicant ID for multer
        req.applicantId = tokenData.applicant_id;

        // Handle file upload
        upload.single('file')(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ message: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ message: 'Tidak ada file yang diupload' });
            }

            const docKey = req.body.doc_key || 'document';
            const file = req.file;

            // Save document record
            const doc = await addApplicantDocument(
                tokenData.applicant_id,
                docKey,
                file.filename,
                `/uploads/documents/${tokenData.applicant_id}/${file.filename}`,
                file.mimetype,
                file.originalname
            );

            res.json({
                ok: true,
                message: 'File berhasil diupload',
                document: {
                    id: doc.id,
                    doc_key: docKey,
                    filename: file.originalname,
                    status: 'pending'
                }
            });
        });
    } catch (e) {
        console.error('Error uploading file:', e);
        res.status(500).json({ message: 'Gagal mengupload file' });
    }
});

// =====================================================
// PROTECTED ROUTES (Auth required)
// =====================================================

// Middleware to handle token from query params (for direct browser links)
router.use('/admin', (req, res, next) => {
    if (req.query.token && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
});

router.use('/admin', verifyToken);
router.use('/admin', requireRole(['ADMIN', 'Supervisor', 'CustomerService']));

/**
 * POST /api/parent-upload/admin/generate/:applicantId
 * Generate upload link for parent
 */
router.post('/admin/generate/:applicantId', async (req, res) => {
    try {
        const applicantId = Number(req.params.applicantId);
        const applicant = await getApplicantById(applicantId);

        if (!applicant) {
            return res.status(404).json({ message: 'Applicant not found' });
        }

        // Invalidate previous tokens
        await invalidatePreviousTokens(applicantId);

        // Create new token
        const tokenData = await createUploadToken(applicantId, req.user.id);

        // Build the full URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const uploadUrl = `${baseUrl}/parent-upload/${tokenData.token}`;

        // Build WhatsApp message
        const message = `Halo Bapak/Ibu ${applicant.name ? `wali dari ${applicant.name}` : ''}, Silakan menggunakan link ini untuk mengedit data dan mengupload dokumen siswa: ${uploadUrl} . Link ini akan kadaluarsa dalam waktu 24 jam.`;

        const waUrl = `https://wa.me/${applicant.parent_phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

        res.json({
            ok: true,
            token: tokenData.token,
            upload_url: uploadUrl,
            wa_url: waUrl,
            expires_at: tokenData.expires_at
        });
    } catch (e) {
        console.error('Error generating upload link:', e);
        res.status(500).json({ message: e.message });
    }
});

/**
 * GET /api/parent-upload/admin/:applicantId
 * Get full applicant data with documents for admin review
 */
router.get('/admin/:applicantId', async (req, res) => {
    try {
        const applicantId = Number(req.params.applicantId);
        const applicant = await getApplicantById(applicantId);

        if (!applicant) {
            return res.status(404).json({ message: 'Applicant not found' });
        }

        const documents = await getApplicantDocuments(applicantId);
        const pendingData = await getPendingData(applicantId);
        const dynamicDetails = await getApplicantDynamicDetails(applicantId);
        const activeToken = await getActiveTokenByApplicantId(applicantId);

        res.json({
            applicant,
            documents,
            pendingData,
            dynamicDetails,
            hasActiveLink: !!activeToken,
            activeLinkExpires: activeToken?.expires_at
        });
    } catch (e) {
        console.error('Error fetching applicant data:', e);
        res.status(500).json({ message: e.message });
    }
});

/**
 * POST /api/parent-upload/admin/:applicantId/review
 * Approve or reject pending changes
 */
router.post('/admin/:applicantId/review', async (req, res) => {
    try {
        const applicantId = Number(req.params.applicantId);
        const { action } = req.body; // 'approve' or 'reject'

        if (action === 'approve') {
            // Apply pending data to applicant
            const applied = await approvePendingData(applicantId);
            if (!applied) {
                return res.status(400).json({ message: 'No pending data to approve' });
            }

            // Mark token as used
            const activeToken = await getActiveTokenByApplicantId(applicantId);
            if (activeToken) {
                await markTokenUsed(activeToken.id);
            }

            res.json({ ok: true, message: 'Data approved and applied' });
        } else if (action === 'reject') {
            // Clear pending data
            await clearPendingData(applicantId);
            res.json({ ok: true, message: 'Pending data rejected and cleared' });
        } else {
            res.status(400).json({ message: 'Invalid action. Use "approve" or "reject"' });
        }
    } catch (e) {
        console.error('Error reviewing data:', e);
        res.status(500).json({ message: e.message });
    }
});

/**
 * POST /api/parent-upload/admin/document/:docId/review
 * Approve or reject a specific document
 */
router.post('/admin/document/:docId/review', async (req, res) => {
    try {
        const docId = Number(req.params.docId);
        const { status } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        await updateDocumentStatus(docId, status, req.user.id);
        res.json({ ok: true, message: `Document ${status}` });
    } catch (e) {
        console.error('Error reviewing document:', e);
        res.status(500).json({ message: e.message });
    }
});

/**
 * GET /api/parent-upload/admin/document/:docId/download
 * Download a document file
 * Note: Token can be passed as query param for direct browser download
 */
router.get('/admin/document/:docId/download', async (req, res) => {
    try {
        // Handle token from query param (for direct browser links)
        if (req.query.token && !req.headers.authorization) {
            req.headers.authorization = `Bearer ${req.query.token}`;
        }

        const docId = Number(req.params.docId);
        const doc = await getDocumentById(docId);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const filePath = getFilePath(doc.applicant_id, doc.filename);

        res.download(filePath, doc.original_filename || doc.filename);
    } catch (e) {
        console.error('Error downloading document:', e);
        res.status(500).json({ message: e.message });
    }
});

module.exports = router;
