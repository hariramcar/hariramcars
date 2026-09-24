import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import Car from './models/Car.js';

dotenv.config();

// Initialize R2 client
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'hariramcars-media';
const PUBLIC_BASE = (process.env.R2_PUBLIC_URL || 'https://pub-a9d1044a70e94eda8754293b52dfe920.r2.dev').replace(/\/$/, '');

async function runMigration() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 MIGRATION: Moving Car Images from ImageKit to Cloudflare R2');
  console.log('   Bucket:', BUCKET);
  console.log('   Public Base:', PUBLIC_BASE);
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  const cars = await Car.find({});
  console.log(`Found ${cars.length} cars in inventory.`);

  // 1. Create a safety backup of all car image states
  const backupData = cars.map(c => ({
    _id: c._id,
    title: c.title,
    make: c.make,
    model: c.model,
    year: c.year,
    images: c.images
  }));
  fs.writeFileSync('./backup_car_images_pre_r2.json', JSON.stringify(backupData, null, 2));
  console.log('💾 Safety backup saved to ./backup_car_images_pre_r2.json\n');

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    let carUpdated = false;
    let newImages = [];

    console.log(`\n───────────────────────────────────────────────────`);
    console.log(`[Car ${i + 1}/${cars.length}] ${car.make} ${car.model} (${car.year || 'N/A'}) - ${car.images ? car.images.length : 0} photos`);

    if (!car.images || car.images.length === 0) {
      continue;
    }

    for (let j = 0; j < car.images.length; j++) {
      const imgObj = car.images[j];
      const originalUrl = imgObj.url || (typeof imgObj === 'string' ? imgObj : '');

      // If already on Cloudflare R2, keep and skip
      if (originalUrl.includes('r2.dev') || originalUrl.includes(BUCKET) || originalUrl.includes('cloudflarestorage.com')) {
        newImages.push(imgObj);
        totalSkipped++;
        continue;
      }

      if (!originalUrl || !originalUrl.startsWith('http')) {
        newImages.push(imgObj);
        continue;
      }

      try {
        process.stdout.write(`  📸 Photo ${j + 1}/${car.images.length}: Downloading... `);

        // Download from ImageKit
        const response = await axios.get(originalUrl, {
          responseType: 'arraybuffer',
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          }
        });

        const imageBuffer = Buffer.from(response.data);

        // Compress with Sharp to high-efficiency WebP
        process.stdout.write('Compressing... ');
        const compressedWebp = await sharp(imageBuffer, { failOn: 'none' })
          .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        // Upload to Cloudflare R2
        process.stdout.write('Uploading to R2... ');
        const key = `inventory/car-${car._id}-photo-${j}-${Date.now()}.webp`;

        await r2.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: compressedWebp,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
          })
        );

        const newUrl = `${PUBLIC_BASE}/${key}`;

        newImages.push({
          url: newUrl,
          publicId: key
        });

        carUpdated = true;
        totalMigrated++;
        console.log(`✅ OK (${(compressedWebp.length / 1024).toFixed(1)} KB)`);

      } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        // Keep original so nothing breaks
        newImages.push(imgObj);
        totalErrors++;
      }
    }

    if (carUpdated) {
      car.images = newImages;
      await car.save();
      console.log(`  💾 Updated Car ${car._id} in MongoDB with Cloudflare R2 URLs.`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎉 MIGRATION FINISHED!');
  console.log(`   Total Migrated to R2: ${totalMigrated}`);
  console.log(`   Already on R2 (Skipped): ${totalSkipped}`);
  console.log(`   Errors (Kept original): ${totalErrors}`);
  console.log('═══════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
