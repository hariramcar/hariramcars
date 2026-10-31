import multer from 'multer';
import ImageKit from 'imagekit';
import sharp from 'sharp';
import crypto from 'crypto';

// Setup Multer memory storage (we compress it before uploading)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 32 * 1024 * 1024,  // 32MB max per file
    files: 25,                    // max 25 files per request
    fieldSize: 1024 * 1024,       // 1MB for text fields
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png',
      'image/webp', 'image/avif', 'image/gif'
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, GIF, WebP and AVIF images allowed'), false);
    }
    cb(null, true);
  },
});

// Setup ImageKit SDK (safe initialization if credentials are provided)
let imagekit = null;
if (process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT) {
  try {
    imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
  } catch (err) {
    console.warn('⚠️ ImageKit initialization warning:', err.message);
  }
}

// Compress and Upload to ImageKit
const uploadToImageKit = async (buffer, originalName) => {
  if (!imagekit) {
    throw new Error('ImageKit is not configured. Please set IMAGEKIT credentials or use R2.');
  }

  try {
    // 1. Memory-Safe Compression via Sharp
    // Downscale massive images to max 1920px width/height and convert to WebP (80% quality)
    // This strictly caps the file size around ~50KB-150KB before sending it over the network
    const compressedBuffer = await sharp(buffer, { failOn: 'none' })
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // 2. Generate unique filename
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    const safeName = (originalName || 'upload').replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `car-${uniqueSuffix}-${safeName}.webp`;

    // 3. Upload to ImageKit via SDK
    const response = await imagekit.upload({
      file: compressedBuffer,
      fileName: fileName,
      folder: '/inventory',
      useUniqueFileName: false // We generated it ourselves
    });

    return {
      public_id: response.fileId,
      secure_url: response.url,
      thumbnail_url: response.url + '?tr=w-400,h-300,q-80', // Generate thumbnail URL on the fly
      filePath: response.filePath
    };
  } catch (error) {
    console.error('ImageKit upload error:', error);
    throw new Error('Image upload failed');
  }
};

// Delete from ImageKit
const deleteFromImageKit = async (publicId) => {
  if (!publicId || !imagekit) return true;
  
  try {
    // Attempt deletion
    await imagekit.deleteFile(publicId);
    return true;
  } catch (error) {
    // Ignore 404 errors (file already deleted)
    if (error.message && error.message.includes('not found')) {
      return true;
    }
    console.error(`Failed to delete ImageKit file ${publicId}:`, error);
    // Don't crash the server on delete failure
    return false;
  }
};

export { upload, uploadToImageKit, deleteFromImageKit };
