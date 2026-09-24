import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

async function verifyR2Health() {
  const bucket = process.env.R2_BUCKET_NAME || 'hariramcars-media';
  console.log('═══════════════════════════════════════════════════════');
  console.log('⚡ CLOUDFLARE R2 HEALTH CHECK & DIAGNOSTIC');
  console.log(`   Bucket: ${bucket}`);
  console.log(`   Account ID: ${process.env.R2_ACCOUNT_ID}`);
  console.log(`   Public Base: ${process.env.R2_PUBLIC_URL}`);
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // 1. Test Write
    process.stdout.write('1. Testing Write Access... ');
    const testKey = `diagnostics/health-check-${Date.now()}.txt`;
    await r2.send(new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: 'Hariram Cars R2 is fully operational.',
      ContentType: 'text/plain'
    }));
    console.log('✅ SUCCESS');

    // 2. Test Delete
    process.stdout.write('2. Testing Delete Access... ');
    await r2.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: testKey
    }));
    console.log('✅ SUCCESS');

    // 3. Inspect Stored Files
    process.stdout.write('3. Querying Bucket Objects... ');
    const list = await r2.send(new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: 1000
    }));

    let totalSize = 0;
    const count = list.KeyCount || 0;
    if (list.Contents) {
      for (const obj of list.Contents) {
        totalSize += (obj.Size || 0);
      }
    }
    console.log('✅ SUCCESS');
    console.log(`\n📊 R2 Bucket Summary:`);
    console.log(`   - Objects in Bucket: ${count}`);
    console.log(`   - Total Storage Used: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   - Free Storage Remaining: ${(10240 - (totalSize / (1024 * 1024))).toFixed(2)} MB (of 10 GB)`);
    console.log(`   - Egress Bandwidth: UNLIMITED ($0.00 / Month)`);
    console.log(`   - Status: 🟢 100% HEALTHY & OPERATIONAL\n`);

  } catch (err) {
    console.error('❌ R2 Diagnostic Error:', err.message);
  }
}

verifyR2Health();
