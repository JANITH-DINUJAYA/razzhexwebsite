/**
 * Router managing protected signed download URL requests.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { db, isConfigured, bucket, admin } = require('../config/firebase');
const { downloadLimiter } = require('../middleware/rateLimiter');
const { generateSignedUrl } = require('../utils/signedUrl');

const JWT_SECRET = process.env.JWT_SECRET || 'razz-hex-deepmind-masterkey';

// Helper to convert Google Drive and Dropbox share links to direct downloads
function getDirectDownloadUrl(url) {
  const driveMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=))([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://docs.google.com/uc?export=download&confirm=no_antivirus&id=${fileId}`;
  }
  
  if (url.includes('dropbox.com')) {
    return url.replace('dl=0', 'dl=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  }
  
  return url;
}

// Google Drive large file confirmation bypass stream helper
async function getGoogleDriveStream(fileId) {
  const url = `https://docs.google.com/uc?export=download&id=${fileId}`;
  
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream'
  });

  const contentType = response.headers['content-type'] || '';
  if (contentType.includes('text/html')) {
    let html = '';
    const textDecoder = new (require('util').TextDecoder)();
    for await (const chunk of response.data) {
      html += textDecoder.decode(chunk);
      if (html.length > 50000) break;
    }
    
    const confirmMatch = html.match(/confirm=([a-zA-Z0-9_]+)/);
    if (confirmMatch) {
      const confirmToken = confirmMatch[1];
      return axios({
        method: 'get',
        url: `https://docs.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`,
        responseType: 'stream'
      });
    }
  }
  
  return response;
}

// Securely redirect to direct download URL (handles Google Drive, Dropbox, Firebase Storage, and Mega)
async function handleDownloadRedirect(downloadUrl, res) {
  try {
    const isExternal = downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://');
    
    if (isExternal) {
      if (downloadUrl.includes('mega.nz')) {
        console.log(`[REDIRECT] Mega URL detected, redirecting: ${downloadUrl}`);
        return res.redirect(downloadUrl);
      }
      
      const directUrl = getDirectDownloadUrl(downloadUrl);
      console.log(`[REDIRECT] Redirecting to direct URL: ${directUrl}`);
      return res.redirect(directUrl);
    } else {
      if (!isConfigured) {
        console.log(`[REDIRECT BYPASS] Backend offline. Redirecting to dummy mock zip file.`);
        return res.redirect('https://file-examples.com/wp-content/uploads/2017/02/zip_2MB.zip');
      }

      console.log(`[REDIRECT] Generating signed URL for Firebase Storage: ${downloadUrl}`);
      const signedUrl = await generateSignedUrl(downloadUrl, 15);
      return res.redirect(signedUrl);
    }
  } catch (error) {
    console.error('[REDIRECT ERROR] Redirect failed:', error);
    return res.redirect(downloadUrl);
  }
}

// 1. GET /api/downloads/free/:productId — Legacy unauthenticated download link generator for Free Panels
router.get('/free/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    let filePath = '';
    let fileName = 'razz-free-package.zip';

    if (!isConfigured) {
      console.log('[FREE DOWNLOAD BYPASS] Backend offline. Providing mock free asset stream.');
      filePath = 'products/panel-files/free-panel-mock.zip';
      const signedUrl = await generateSignedUrl(filePath, 15);
      return res.status(200).json({ downloadUrl: signedUrl, fileName: 'free-panel-mock.zip' });
    }

    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product catalog profile not found.' });
    }

    const product = productDoc.data();
    
    if (product.category !== 'Free Panel' && product.price !== 0) {
      return res.status(403).json({ error: 'This product is not free.' });
    }

    filePath = product.filePath;
    
    if (!filePath) {
      return res.status(400).json({ error: 'No secure file path configured for this product yet. Contact admin.' });
    }

    let downloadUrl = '';
    const isExternalLink = filePath.startsWith('http://') || filePath.startsWith('https://');

    if (isExternalLink) {
      downloadUrl = filePath;
      fileName = filePath.includes('.zip') ? filePath.split('/').pop().split('?')[0] : 'Free_Panel_Package';
    } else {
      fileName = filePath.split('/').pop() || 'free-package.zip';
      downloadUrl = await generateSignedUrl(filePath, 15);
    }

    res.status(200).json({
      downloadUrl,
      fileName
    });
  } catch (error) {
    console.error('[FREE DOWNLOAD] Generation failed:', error);
    res.status(500).json({ error: 'Server error generating download link for free panel.' });
  }
});

// 2. POST /api/downloads/generate — Legacy protected signed download endpoint
router.post('/generate', downloadLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Verification failed. Session token missing or invalid.' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { licenseId, productId, deviceFingerprint } = decoded;

    let filePath = '';
    let fileName = 'razz-hex-package.zip';

    if (!isConfigured) {
      console.log('[DOWNLOAD BYPASS] Backend offline. Providing demo signed assets stream.');
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

    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product catalog profile not found.' });
    }

    const product = productDoc.data();
    filePath = product.filePath;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Secure package file path or download link is not configured for this product yet. Contact admin.' });
    }

    let downloadUrl = '';
    const isExternalLink = filePath.startsWith('http://') || filePath.startsWith('https://');

    if (isExternalLink) {
      downloadUrl = filePath;
      fileName = filePath.includes('.zip') ? filePath.split('/').pop().split('?')[0] : 'Google_Drive_Package';
    } else {
      fileName = filePath.split('/').pop() || 'razz-package.zip';
      downloadUrl = await generateSignedUrl(filePath, 15);
    }

    await db.collection('downloads').add({
      licenseId,
      productId,
      deviceFingerprint,
      ipAddress: req.ip,
      downloadedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      downloadUrl,
      fileName,
      expiresIn: 900
    });

  } catch (error) {
    console.error('[DOWNLOAD] Generation collapsed:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please re-verify your license key to continue.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Download authorization expired or session signature corrupt. Verify license again.' });
    }
    
    res.status(500).json({ error: error.message || 'Server collapsed requesting signed storage links.' });
  }
});

// 3. POST /api/downloads/info — Retrieve product name and file mirrors (names and indices only)
router.post('/info', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Verification failed. Session token missing or invalid.' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { productId } = decoded;

    if (!isConfigured) {
      let productName = 'Premium Mock Panel';
      let files = [{ name: 'Main Download', index: 0 }];
      if (productId === '1') {
        productName = 'Android RAT Panel';
      } else if (productId === '3') {
        productName = 'iOS MDM Controller';
      } else if (productId === '5') {
        productName = 'PC Remote Admin';
      }
      return res.status(200).json({ productName, files });
    }

    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product catalog profile not found.' });
    }

    const product = productDoc.data();
    
    let files = [];
    if (product.filePaths && product.filePaths.length > 0) {
      files = product.filePaths.map((f, idx) => ({
        name: f.name || `Download Mirror ${idx + 1}`,
        index: idx
      }));
    } else if (product.filePath) {
      files = [{ name: 'Main Download', index: 0 }];
    }

    res.status(200).json({
      productName: product.name,
      files
    });

  } catch (error) {
    console.error('[DOWNLOAD INFO] Retrieval failed:', error);
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Session expired or invalid. Please re-verify your license key.' });
    }
    res.status(500).json({ error: 'Server error retrieving download info.' });
  }
});

// 4. GET /api/downloads/file — Stream file download securely using token and index query parameters
router.get('/file', async (req, res) => {
  const { token, index } = req.query;
  const linkIndex = parseInt(index, 10) || 0;

  if (!token) {
    return res.status(401).send('Verification failed. Session token missing.');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { licenseId, productId, deviceFingerprint } = decoded;

    let downloadUrl = '';
    let fileName = 'razz-hex-package.zip';
    let productName = 'Secure Digital Package';

    if (!isConfigured) {
      console.log('[DOWNLOAD BYPASS] Backend offline. Streaming demo assets.');
      if (productId === '1') {
        downloadUrl = 'products/panel-files/android-rat-v2.1.zip';
        fileName = 'android-rat-v2.1.zip';
      } else if (productId === '3') {
        downloadUrl = 'products/panel-files/ios-mdm-v1.5.zip';
        fileName = 'ios-mdm-v1.5.zip';
      } else if (productId === '5') {
        downloadUrl = 'products/panel-files/pc-remote-v3.0.zip';
        fileName = 'pc-remote-v3.0.zip';
      } else {
        downloadUrl = 'products/panel-files/stealth-package.zip';
        fileName = 'stealth-package.zip';
      }
      
      return handleDownloadRedirect(downloadUrl, res);
    }

    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).send('Product catalog profile not found.');
    }

    const product = productDoc.data();
    productName = product.name;

    if (product.filePaths && product.filePaths.length > 0) {
      const linkObj = product.filePaths[linkIndex];
      if (linkObj) {
        downloadUrl = linkObj.path;
        fileName = linkObj.name ? `${linkObj.name.replace(/\s+/g, '_')}_Package` : 'razz-package';
      }
    } else {
      downloadUrl = product.filePath;
    }

    if (!downloadUrl) {
      return res.status(400).send('Secure file path or download link is not configured for this product.');
    }

    const isExternal = downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://');
    if (isExternal) {
      if (downloadUrl.includes('.zip')) {
        fileName = downloadUrl.split('/').pop().split('?')[0];
      } else if (!fileName.endsWith('.zip')) {
        fileName = `${fileName}.zip`;
      }
    } else {
      fileName = downloadUrl.split('/').pop() || 'razz-package.zip';
    }

    await db.collection('downloads').add({
      licenseId,
      productId,
      deviceFingerprint,
      ipAddress: req.ip,
      downloadedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await handleDownloadRedirect(downloadUrl, res);

  } catch (error) {
    console.error('[DOWNLOAD STREAM] Security failure:', error);
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).send('Session expired. Please re-verify your license key.');
    }
    res.status(500).send('Server collapsed requesting signed storage links.');
  }
});

// 5. GET /api/downloads/file/free/:productId/:index — Stream free panel files securely
router.get('/file/free/:productId/:index', async (req, res) => {
  const { productId, index } = req.params;
  const linkIndex = parseInt(index, 10) || 0;

  try {
    let downloadUrl = '';
    let fileName = 'razz-free-package.zip';
    let productName = 'Free Panel';

    if (!isConfigured) {
      console.log('[FREE DOWNLOAD BYPASS] Backend offline. Streaming mock free asset.');
      downloadUrl = 'products/panel-files/free-panel-mock.zip';
      fileName = 'free-panel-mock.zip';
      return streamFile(downloadUrl, fileName, res);
    }

    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).send('Product catalog profile not found.');
    }

    const product = productDoc.data();
    productName = product.name;

    if (product.category !== 'Free Panel' && product.price !== 0) {
      return res.status(403).send('This product is not free.');
    }

    if (product.filePaths && product.filePaths.length > 0) {
      const linkObj = product.filePaths[linkIndex];
      if (linkObj) {
        downloadUrl = linkObj.path;
        fileName = linkObj.name ? `${linkObj.name.replace(/\s+/g, '_')}_Package` : 'free-package';
      }
    } else {
      downloadUrl = product.filePath;
    }

    if (!downloadUrl) {
      return res.status(400).send('No secure file path configured for this product.');
    }

    const isExternal = downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://');
    if (isExternal) {
      if (downloadUrl.includes('.zip')) {
        fileName = downloadUrl.split('/').pop().split('?')[0];
      } else if (!fileName.endsWith('.zip')) {
        fileName = `${fileName}.zip`;
      }
    } else {
      fileName = downloadUrl.split('/').pop() || 'free-package.zip';
    }

    await handleDownloadRedirect(downloadUrl, res);

  } catch (error) {
    console.error('[FREE DOWNLOAD STREAM] failed:', error);
    res.status(500).send('Server error generating download link.');
  }
});

module.exports = router;
