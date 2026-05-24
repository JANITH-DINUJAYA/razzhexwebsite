/**
 * Router managing protected signed download URL requests.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, isConfigured, admin } = require('../config/firebase');
const { downloadLimiter } = require('../middleware/rateLimiter');
const { generateSignedUrl } = require('../utils/signedUrl');

const JWT_SECRET = process.env.JWT_SECRET || 'razz-hex-deepmind-masterkey';

// POST /api/downloads/generate — Protected signed download endpoint (uses downloadLimiter)
router.post('/generate', downloadLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Verification failed. Session token missing or invalid.' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // 1. Verify and decode JWT session token
    const decoded = jwt.verify(token, JWT_SECRET);
    const { licenseId, productId, deviceFingerprint } = decoded;

    // 2. Fetch associated product profile details
    let filePath = '';
    let fileName = 'razz-hex-package.zip';

    if (!isConfigured) {
      console.log('[DOWNLOAD BYPASS] Backend offline. Providing demo signed assets stream.');
      // Resolve mock details
      if (productId === '1') {
        filePath = 'products/panel-files/android-rat-v2.1.zip';
        fileName = 'android-rat-v2.1.zip';
      } else if (productId === '3') {
        filePath = 'products/panel-files/ios-mdm-v1.5.zip';
        fileName = 'ios-mdm-v1.5.zip';
      } else if (productId === '5') {
        filePath = 'products/panel-files/pc-remote-v3.0.zip';
        fileName = 'pc-remote-v3.0.zip';
      } else {
        filePath = 'products/panel-files/stealth-package.zip';
        fileName = 'stealth-package.zip';
      }
      
      const signedUrl = await generateSignedUrl(filePath, 15);
      return res.status(200).json({ downloadUrl: signedUrl, fileName, expiresIn: 900 });
    }

    // Standard database path lookup
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product catalog profile not found.' });
    }

    const product = productDoc.data();
    filePath = product.filePath;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Secure package file path is not configured for this product yet. Contact admin.' });
    }

    fileName = filePath.split('/').pop() || 'razz-package.zip';

    // 3. Generate v4 expiring signed URL (15 mins)
    const signedUrl = await generateSignedUrl(filePath, 15);

    // 4. Log download entry in Firestore
    await db.collection('downloads').add({
      licenseId,
      productId,
      deviceFingerprint,
      ipAddress: req.ip,
      downloadedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 5. Respond with URL and parameters
    res.status(200).json({
      downloadUrl: signedUrl,
      fileName,
      expiresIn: 900 // 15 mins in seconds
    });

  } catch (error) {
    console.error('[DOWNLOAD] Generation collapsed:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Download authorization expired or session signature corrupt. Verify license again.' });
    }
    
    res.status(500).json({ error: error.message || 'Server collapsed requesting signed storage links.' });
  }
});

module.exports = router;
