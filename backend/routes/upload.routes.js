import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { upload, uploadToR2 } from '../config/r2.js';

const router = express.Router();

// Handler for Cloudflare R2 upload with Sharp compression
const handleR2Upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const result = await uploadToR2(req.file.buffer, req.file.originalname, 'inventory');

    res.json({ 
      success: true, 
      url: result.secure_url, 
      publicId: result.public_id 
    });
  } catch (error) {
    console.error('R2 Upload Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cloudflare R2 upload endpoints (supports /r2 and /imagekit for backwards compatibility)
router.post('/r2', protect, adminOnly, upload.single('image'), handleR2Upload);
router.post('/imagekit', protect, adminOnly, upload.single('image'), handleR2Upload);

export default router;
