/**
 * API request rate-limit parameters for security compliance.
 */

const rateLimit = require('express-rate-limit');

// General API requests: limit to 150 per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  message: { error: 'Too many API requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strictly rate-limit verification checks: limit to 5 per minute per IP to block dictionary/brute-force attacks
const licenseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many license verification attempts. Please try again in 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Expiring signed link downloads: limit to 10 per 15 minutes per IP
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many file download requests. Please check active session limits.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  licenseLimiter,
  downloadLimiter,
};
