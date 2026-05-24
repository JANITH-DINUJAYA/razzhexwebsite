/**
 * Secure Expiring signed URL generator for storage binaries.
 */

const { bucket, isConfigured } = require('../config/firebase');

/**
 * Returns a secure signed URL for a file in Firebase Storage.
 * Defaults to 15-minute expirations.
 */
async function generateSignedUrl(filePath, expiresInMinutes = 15) {
  if (!isConfigured) {
    console.warn('[STORAGE] Firebase offline. Returning mock signed link target.');
    return `https://demo-storage-bypass.example.com/${filePath}?token=mock-expiring-sig-${Math.random().toString(36).substring(2)}`;
  }

  try {
    const file = bucket.file(filePath);
    
    // Validate file existence first
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`Target storage binary not found: ${filePath}`);
    }

    const expirationTimestamp = Date.now() + expiresInMinutes * 60 * 1000;

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expirationTimestamp,
    });

    return signedUrl;
  } catch (error) {
    console.error('[STORAGE] Error generating signed download link:', error);
    throw error;
  }
}

module.exports = {
  generateSignedUrl
};
