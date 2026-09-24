import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import crypto from 'crypto';

// Setup Multer memory storage
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

// Setup Cloudflare R2 S3 Client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const getPublicUrl = () => {
  let url = process.env.R2_PUBLIC_URL || '';
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
};

/**
 * Compress with Sharp and upload buffer to Cloudflare R2
 */
const uploadToR2 = async (buffer, originalName, folder = 'inventory') => {
  try {
    // 1. Memory-Safe Compression via Sharp
    // Convert to modern WebP with max 1920px and 80% quality (~60KB - 120KB)
    const compressedBuffer = await sharp(buffer, { failOn: 'none' })
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // 2. Generate clean, unique filename
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    const safeName = (originalName || 'upload').replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/car-${uniqueSuffix}-${safeName}.webp`;

    // 3. Upload to R2 with permanent cache header for CDN speed
    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: compressedBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const publicBase = getPublicUrl();
    const finalUrl = `${publicBase}/${key}`;

    return {
      public_id: key,
      secure_url: finalUrl,
      url: finalUrl,
      key: key
    };
  } catch (error) {
    console.error('Cloudflare R2 upload error:', error);
    throw new Error('Cloudflare R2 image upload failed: ' + error.message);
  }
};

/**
 * Delete object from Cloudflare R2
 */
const deleteFromR2 = async (keyOrUrl) => {
  if (!keyOrUrl) return true;

  try {
    let key = keyOrUrl;
    // If full URL was provided, extract the R2 key
    const publicBase = getPublicUrl();
    if (key.startsWith(publicBase)) {
      key = key.replace(`${publicBase}/`, '');
    } else if (key.startsWith('http')) {
      const parsed = new URL(key);
      key = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
    }

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    if (error.name === 'NoSuchKey' || (error.message && error.message.includes('not found'))) {
      return true;
    }
    console.error(`Failed to delete R2 object ${keyOrUrl}:`, error);
    return false;
  }
};

export { upload, uploadToR2, deleteFromR2, r2Client };
