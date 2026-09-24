import express from 'express';
import mongoose from 'mongoose';
import Analytics from '../models/Analytics.js';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client } from '../config/r2.js';

const router = express.Router();


// @route   POST /api/analytics/track
// @desc    Track page view and unique visitor
// @access  Public
router.post('/track', async (req, res) => {
  try {
    const today = new Date();
    // Normalize to midnight UTC for daily tracking
    today.setUTCHours(0, 0, 0, 0);

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    let analytics = await Analytics.findOne({ date: today });
    if (!analytics) {
      analytics = new Analytics({ 
        date: today, 
        pageViews: 1, 
        visitors: 1, 
        ips: [ip] 
      });
    } else {
      if (!analytics.ips.includes(ip)) {
        analytics.pageViews += 1;
        analytics.visitors += 1;
        analytics.ips.push(ip);
      }
    }
    
    await analytics.save();
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Analytics tracking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/analytics/app-install
// @desc    Track app installation
// @access  Public
router.post('/app-install', async (req, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await Analytics.findOneAndUpdate(
      { date: today },
      { $inc: { appInstalls: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('App install tracking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/analytics/summary
// @desc    Get traffic summary for the last 30 days
// @access  Public
router.get('/summary', async (req, res) => {
  try {
    const limitDays = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (limitDays - 1));
    startDate.setUTCHours(0, 0, 0, 0);

    const data = await Analytics.find({ date: { $gte: startDate } }).sort({ date: 1 });
    
    // Fill missing days with 0s to ensure a continuous chart
    const result = [];
    
    for (let i = limitDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      
      const record = data.find(r => r.date.getTime() === d.getTime());
      
      // Format as "12 Aug" for better readability on 30-day graphs
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedDate = `${d.getDate()} ${monthNames[d.getMonth()]}`;

      result.push({
        name: formattedDate,
        pageViews: record ? record.pageViews : 0,
        visitors: record ? record.visitors : 0,
        fullDate: d
      });
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/analytics/app-installs/total
// @desc    Get total app installs across all time
// @access  Public
router.get('/app-installs/total', async (req, res) => {
  try {
    const result = await Analytics.aggregate([
      { $group: { _id: null, totalInstalls: { $sum: "$appInstalls" } } }
    ]);
    const total = result.length > 0 ? result[0].totalInstalls : 0;
    res.status(200).json({ total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// In-memory cache for R2 bucket stats to prevent excessive API calls
let cachedR2Stats = null;
let lastR2FetchTime = 0;
const R2_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache

async function getR2BucketStats() {
  const now = Date.now();
  if (cachedR2Stats && (now - lastR2FetchTime < R2_CACHE_TTL_MS)) {
    return cachedR2Stats;
  }

  try {
    const bucket = process.env.R2_BUCKET_NAME || 'hariramcars-media';
    let isTruncated = true;
    let continuationToken;
    let totalCount = 0;
    let totalBytes = 0;

    while (isTruncated) {
      const res = await r2Client.send(new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      }));

      if (res.Contents) {
        for (const obj of res.Contents) {
          totalCount++;
          totalBytes += (obj.Size || 0);
        }
      }
      isTruncated = res.IsTruncated;
      continuationToken = res.NextContinuationToken;
    }

    const usedMB = parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
    const usedGB = parseFloat((totalBytes / (1024 * 1024 * 1024)).toFixed(4));
    const totalGB = 10;
    const percentage = parseFloat(((usedGB / totalGB) * 100).toFixed(2));

    cachedR2Stats = {
      usedMB,
      usedGB,
      totalGB,
      percentage,
      fileCount: totalCount,
      bucket,
      status: 'Optimal',
      bandwidth: 'Unlimited ($0 Egress)',
      cdnStatus: 'Active'
    };
    lastR2FetchTime = now;
    return cachedR2Stats;
  } catch (err) {
    console.error('Error fetching R2 stats:', err.message);
    return cachedR2Stats || {
      usedMB: 0,
      usedGB: 0,
      totalGB: 10,
      percentage: 0,
      fileCount: 0,
      bucket: process.env.R2_BUCKET_NAME || 'hariramcars-media',
      status: 'Healthy',
      bandwidth: 'Unlimited ($0 Egress)',
      cdnStatus: 'Active'
    };
  }
}

// @route   GET /api/analytics/storage
// @desc    Get MongoDB and Cloudflare R2 storage health stats
// @access  Public
router.get('/storage', async (req, res) => {
  try {
    // 1. MongoDB Stats
    const db = mongoose.connection.db;
    const dbStats = await db.stats();
    const mongoUsedMB = dbStats.storageSize / (1024 * 1024);
    const mongoTotalMB = 512;
    const mongoPercentage = (mongoUsedMB / mongoTotalMB) * 100;

    // 2. Cloudflare R2 Live Stats
    const r2 = await getR2BucketStats();

    res.status(200).json({
      mongodb: {
        usedMB: parseFloat(mongoUsedMB.toFixed(2)),
        totalMB: mongoTotalMB,
        percentage: parseFloat(mongoPercentage.toFixed(2))
      },
      r2: {
        usedMB: r2.usedMB,
        usedGB: r2.usedGB,
        totalGB: r2.totalGB,
        percentage: r2.percentage,
        fileCount: r2.fileCount,
        bandwidth: r2.bandwidth,
        status: r2.status,
        bucket: r2.bucket,
        cdnStatus: r2.cdnStatus
      },
      // Backward compatibility for existing frontends
      cloudinary: {
        usedGB: r2.usedGB,
        bandwidthGB: 0,
        totalGB: 10,
        bandwidthTotalGB: 999999
      }
    });
  } catch (err) {
    console.error('Storage stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
