/**
 * Razz Hex Digital Products Platform
 * Express.js Backend API entry point
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { generalLimiter } = require('./middleware/rateLimiter');

// Import routers
const productsRouter = require('./routes/products');
const licensesRouter = require('./routes/licenses');
const downloadsRouter = require('./routes/downloads');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Apply security headers and cross-origin policies
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP constraints in dev environments to load styles comfortably
}));

const allowedOrigins = (() => {
  const base = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  if (process.env.ALLOWED_ORIGINS) {
    const extra = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
    base.push(...extra);
  }
  if (process.env.VERCEL_URL) {
    base.push(`https://${process.env.VERCEL_URL}`);
  }
  return base;
})();

const corsOptionsDelegate = (req, callback) => {
  const origin = req.header('Origin');
  let isAllowed = false;

  if (!origin) {
    isAllowed = true;
  } else {
    // 1. Check against the explicit allowed origins array
    if (allowedOrigins.includes(origin)) {
      isAllowed = true;
    } else {
      // 2. Check if same-origin request
      const host = req.header('host');
      const forwardedHost = req.header('x-forwarded-host');
      try {
        const originHost = new URL(origin).host;
        if (originHost === host || (forwardedHost && originHost === forwardedHost)) {
          isAllowed = true;
        }
      } catch (e) {
        // Ignore malformed URL errors
      }
    }

    // 3. Match Vercel project deployment domains (production & previews)
    if (!isAllowed) {
      const matchVercelPattern = /^https:\/\/razzhexwebsite(-.*)?\.vercel\.app$/i.test(origin);
      if (matchVercelPattern) {
        isAllowed = true;
      }
    }
  }

  if (isAllowed) {
    callback(null, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    });
  } else {
    callback(new Error(`CORS: Origin ${origin} not permitted.`));
  }
};

app.use(cors(corsOptionsDelegate));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all requests
app.use('/api', generalLimiter);

// Mount API routers
app.use('/api/products', productsRouter);
app.use('/api/licenses', licensesRouter);
app.use('/api/downloads', downloadsRouter);
app.use('/api/admin', adminRouter);

// Base route indicators
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'operational', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server exception:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.'
  });
});

app.listen(PORT, () => {
  console.log(`[RAZZ HEX] API Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  console.log(`[RAZZ HEX] Client requests proxied securely via port 3000.`);
});

module.exports = app;
