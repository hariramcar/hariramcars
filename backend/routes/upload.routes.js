import express from 'express';
import axios from 'axios';
import FormData from 'form-data';
import heicConvert from 'heic-convert';
import multer from 'multer';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { upload } from '../config/imgbb.js';
import { uploadToR2 } from '../config/r2.js';

const router = express.Router();

// Configure Multer for memory storage (for R2 direct uploads)
const storage = multer.memoryStorage();
const uploadMem = multer({ storage });

router.get('/signature', protect, adminOnly, (req, res) => {
  try {
    res.json({ 
      api_key: process.env.IMGBB_API_KEY
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route for handling HEIC conversion on the backend for iPhones
router.post('/heic-to-imgbb', protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let imageBuffer = req.file.buffer;

    // Convert HEIC to JPG using backend WASM
    const outputBuffer = await heicConvert({
      buffer: imageBuffer,
      format: 'JPEG',
      quality: 0.95
    });

    // Upload the converted JPG to ImgBB
    const formData = new FormData();
    formData.append('image', outputBuffer, { filename: req.file.originalname.replace(/\.heic$|\.heif$/i, '.jpg'), contentType: 'image/jpeg' });

    const imgbbRes = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, formData, {
      headers: formData.getHeaders()
    });

    if (imgbbRes.data && imgbbRes.data.success) {
      res.json({ success: true, data: { url: imgbbRes.data.data.url, id: imgbbRes.data.data.id } });
    } else {
      res.status(500).json({ success: false, message: 'ImgBB upload failed after conversion' });
    }

  } catch (error) {
    console.error('HEIC Backend Conversion Error:', error);
    res.status(500).json({ success: false, message: 'Failed to convert HEIC image: ' + error.message });
  }
});

// Handler for Cloudflare R2 upload with Sharp compression
const handleR2Upload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

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

// Cloudflare R2 endpoints (supports /r2 and /imagekit for backwards compatibility)
router.post('/r2', protect, adminOnly, uploadMem.single('image'), handleR2Upload);
router.post('/imagekit', protect, adminOnly, uploadMem.single('image'), handleR2Upload);

export default router;
