// ═══════════════════════════════════════════════════════
//  Hariram Motors — Express API Entry Point
// ═══════════════════════════════════════════════════════

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import connectDB from './config/db.js';
import { sanitizeInputs } from './middleware/validate.js';

// ── Environment Validation ──
const requiredEnvs = ['MONGODB_URI', 'JWT_SECRET', 'IMGBB_API_KEY'];
requiredEnvs.forEach((envName) => {
  if (!process.env[envName]) {
    console.error(`❌ CRITICAL: ${envName} is missing in environment variables.`);
    // Instead of crashing the serverless function immediately (which breaks CORS),
    // we log the error. Individual routes will fail gracefully later.
  }
});

// ── Custom Mongo Sanitizer Removed ──

// Route imports
import authRoutes from './routes/auth.routes.js';
import carRoutes from './routes/car.routes.js';
import sellRequestRoutes from './routes/sellRequest.routes.js';
import messageRoutes from './routes/message.routes.js';
import happyCustomerRoutes from './routes/happyCustomer.routes.js';
import promoBannerRoutes from './routes/promoBanner.routes.js';
import siteSettingRoutes from './routes/siteSetting.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import brandRoutes from './routes/brand.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';

// ── Initialize Express ──
const app = express();
app.set('trust proxy', 1);


// ── Global CORS Middleware (Must be first) ──
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://www.hariramcars.com',
  'https://hariramcars.com',
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      console.warn(`CORS blocked request from: ${origin}`);
      const error = new Error(`CORS blocked: ${origin} not allowed`);
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'X-Original-Path'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400,
  })
);

// Fix req.url for Vercel using frontend custom header
app.use((req, res, next) => {
  if (process.env.VERCEL === '1') {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const queryPath = urlObj.searchParams.get('path');

    if (queryPath) {
      // Normalize queryPath: strip leading slashes and optional 'api/' prefix
      const cleanPath = queryPath.replace(/^\/?(api\/)?/, '');
      req.url = '/api/' + cleanPath;

      urlObj.searchParams.delete('path');
      const remainingSearch = urlObj.searchParams.toString();
      if (remainingSearch) {
        req.url += '?' + remainingSearch;
      }
      req.originalUrl = req.url;
    } else {
      const originalPath = req.headers['x-original-path'];
      if (originalPath) {
        req.url = originalPath.startsWith('/api') ? originalPath : '/api' + (originalPath.startsWith('/') ? '' : '/') + originalPath;
      } else {
        const routeMatches = req.headers['x-now-route-matches'];
        if (routeMatches) {
          const match = routeMatches.match(/1=([^&]+)/);
          if (match) {
            req.url = '/api/' + match[1];
            req.originalUrl = req.url;
          }
        } else if (!req.url.startsWith('/api')) {
          req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
          req.originalUrl = req.url;
        }
      }
    }
  }
  next();
});

// ── Connect to MongoDB on every request (Serverless Pattern) ──
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    res.status(502).json({ error: 'Database connection failed. Please check your configuration.' });
  }
});

// ── Global Middleware ──
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
        ],
        workerSrc: ["'self'", 'blob:'],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://res.cloudinary.com',
          'https://images.unsplash.com',
          'https://lh3.googleusercontent.com',
        ],
        connectSrc: [
          "'self'",
          process.env.FRONTEND_URL,
          'https://api.cloudinary.com',
        ],
        frameSrc: [
          "'self'",
          'https://www.google.com',
          'https://maps.google.com',
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    frameguard: { action: 'sameorigin' },
    hidePoweredBy: true,
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(sanitizeInputs);
// Removed duplicate CORS block
// Rate limiting
// Rate limiting (Only enabled in production)
if (process.env.NODE_ENV === 'production') {
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Try again later.' },
    skip: (req) =>
      (req.method === 'GET' && req.path.startsWith('/api/cars')) ||
      req.path.startsWith('/api/upload') ||
      req.path === '/api/health',
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Try again in 15 minutes.' },
    skipSuccessfulRequests: true,
  });

  const formLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many submissions. Try again in an hour.' },
  });

  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { error: 'Upload limit reached. Try again later.' },
  });

  app.use('/api/', generalLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/messages', formLimiter);
  app.use('/api/sell-requests', uploadLimiter);
}

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Hariram Motors API is running' });
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/sell-requests', sellRequestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/happy-customers', happyCustomerRoutes);
app.use('/api/promo-banners', promoBannerRoutes);
app.use('/api/site-settings', siteSettingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', subscriptionRoutes);

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.url, originalUrl: req.originalUrl, headers: req.headers });
});

// ── Global Error Handler ──
app.use((err, _req, res, _next) => {
  console.error(`[Error] ${err.name}: ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong on our end. Please try again later.'
      : err.message,
  });
});

// ── Start Server (Only if not in Vercel Serverless environment) ──
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`🚗 Hariram Motors API running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // ── Graceful Shutdown ──
  const gracefulShutdown = () => {
    console.log('Received kill signal, shutting down gracefully...');
    server.close(() => {
      console.log('Closed out remaining connections.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

// ── Export for Vercel Serverless ──
export default app;
