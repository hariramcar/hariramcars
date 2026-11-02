/**
 * Client-Side Image Compression Utility
 * Compresses camera photos before uploading to Cloudflare R2 / Express backend.
 * Reduces 10-15MB phone camera photos to ~150-300KB without quality loss,
 * preventing network timeouts, memory exhaustion, and dropped uploads.
 */

export async function compressImage(file) {
  if (!file) return file;

  // Don't re-compress files already small enough (under 350KB)
  if (file.size <= 350 * 1024) {
    return file;
  }

  // HEIC/HEIF files: leave as is (backend or browser can handle)
  const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
  if (isHeic) {
    return file;
  }

  try {
    const { default: imageCompression } = await import('browser-image-compression');
    const options = {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.82,
    };
    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], file.name, {
      type: compressedBlob.type || file.type,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn(`[ImageCompressor] Falling back to original file for ${file.name}:`, err);
    return file;
  }
}
