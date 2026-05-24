/**
 * License Key generation and cryptographic hash tools.
 */

const crypto = require('crypto');

/**
 * Generates a license key matching format: RAZZ-XXXX-XXXX-XXXX
 * Each segment contains 4 characters.
 */
function generateLicenseKey() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Cleaned characters set (removed confusing O, 0, I, 1)
  
  const generateSegment = () => {
    let segment = '';
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      segment += characters.charAt(bytes[i] % characters.length);
    }
    return segment;
  };

  return `RAZZ-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
}

/**
 * Returns SHA-256 hash of a license key.
 * Used to securely store and lookup license keys in Firestore records.
 */
function hashKey(key) {
  if (!key) return '';
  // Sanitize key by stripping spaces and uppercase standardization before hashing
  const sanitized = key.trim().toUpperCase();
  return crypto.createHash('sha256').update(sanitized).digest('hex');
}

module.exports = {
  generateLicenseKey,
  hashKey,
};
