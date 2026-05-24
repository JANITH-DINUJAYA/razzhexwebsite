/**
 * Router managing administrative calculations, storage files, and uploads.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { db, bucket, isConfigured, admin } = require('../config/firebase');
const { verifyAdmin } = require('../middleware/adminAuth');

// Configure Multer storage to stream files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.zip', '.exe', '.dmg', '.msi', '.pkg', '.tar.gz'];
    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed. Supported formats: ${allowed.join(', ')}`));
    }
  }
});

// All routes require administrative tokens
router.use(verifyAdmin);

// 1. GET /api/admin/stats — Retrieve overview metrics summaries
router.get('/stats', async (req, res) => {
  if (!isConfigured) {
    return res.status(200).json({
      products: 6,
      activeLicenses: 24,
      totalDownloads: 156,
      revenue: 2340
    });
  }

  try {
    const [productsRef, licensesRef, downloadsRef] = await Promise.all([
      db.collection('products').where('active', '==', true).get(),
      db.collection('licenses').where('status', '==', 'active').get(),
      db.collection('downloads').get()
    ]);

    // Simple revenue estimate: summing up all active licenses * linked product price
    let estimatedRevenue = 0;
    const licenseDocs = licensesRef.docs;

    // Load active products list to map pricing
    const productsMap = {};
    productsRef.forEach(doc => {
      productsMap[doc.id] = doc.data().price || 0;
    });

    licenseDocs.forEach(doc => {
      const lic = doc.data();
      const price = productsMap[lic.productId] || 49; // fallback
      estimatedRevenue += price;
    });

    res.status(200).json({
      products: productsRef.size,
      activeLicenses: licensesRef.size,
      totalDownloads: downloadsRef.size,
      revenue: estimatedRevenue
    });
  } catch (error) {
    console.error('[ADMIN] Stats retrieval failure:', error);
    res.status(500).json({ error: 'Failed to retrieve stats from database.' });
  }
});

// 2. POST /api/admin/upload — Stream package binary to Firebase Storage
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No package file attachment found.' });
  }

  const file = req.file;
  const originalName = file.originalname;
  const extension = originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
  
  const uuidFilename = `${uuidv4()}${extension}`;
  const storagePath = `products/panel-files/${uuidFilename}`;

  if (!isConfigured) {
    console.log('[UPLOAD BYPASS] Backend offline. Generating local file record.');
    // Simulated upload response
    return res.status(200).json({
      filePath: storagePath,
      fileName: originalName,
      fileSize: file.size,
      contentType: file.mimetype || 'application/zip',
      uploadedAt: new Date().toISOString()
    });
  }

  try {
    const fileRef = bucket.file(storagePath);
    
    // Stream buffer into remote storage file endpoint
    await fileRef.save(file.buffer, {
      contentType: file.mimetype || 'application/zip',
      metadata: {
        metadata: {
          originalName,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    const fileDetails = {
      filePath: storagePath,
      fileName: originalName,
      fileSize: file.size,
      contentType: file.mimetype || 'application/zip',
      uploadedAt: new Date().toISOString()
    };

    // Save details in storage records log
    await db.collection('uploaded_files').add(fileDetails);

    res.status(200).json(fileDetails);
  } catch (error) {
    console.error('[ADMIN] File stream failure:', error);
    res.status(500).json({ error: 'Failed to stream file package to Firebase Storage.' });
  }
});

// 3. GET /api/admin/files — List all uploaded packages
router.get('/files', async (req, res) => {
  if (!isConfigured) {
    // Offline simulated responses
    return res.status(200).json([
      { filePath: 'products/panel-files/android-rat-v2.1.zip', fileName: 'android-rat-v2.1.zip', fileSize: 4404019, contentType: 'application/zip', uploadedAt: new Date().toISOString() },
      { filePath: 'products/panel-files/ios-mdm-v1.5.zip', fileName: 'ios-mdm-v1.5.zip', fileSize: 7130316, contentType: 'application/zip', uploadedAt: new Date().toISOString() },
      { filePath: 'products/panel-files/pc-remote-v3.0.zip', fileName: 'pc-remote-v3.0.zip', fileSize: 13002342, contentType: 'application/zip', uploadedAt: new Date().toISOString() }
    ]);
  }

  try {
    const snapshot = await db.collection('uploaded_files')
      .orderBy('uploadedAt', 'desc')
      .get();

    const list = [];
    snapshot.forEach(doc => {
      list.push(doc.data());
    });

    if (list.length > 0) {
      return res.status(200).json(list);
    }

    // Direct storage fallback listing if database index is empty
    const [files] = await bucket.getFiles({ prefix: 'products/panel-files/' });
    const directList = files.map(file => {
      const meta = file.metadata;
      return {
        filePath: file.name,
        fileName: meta.metadata?.originalName || file.name.split('/').pop(),
        fileSize: Number(meta.size) || 0,
        contentType: meta.contentType || 'application/zip',
        uploadedAt: meta.timeCreated || new Date().toISOString()
      };
    });

    res.status(200).json(directList);
  } catch (error) {
    console.error('[ADMIN] Storage files list error:', error);
    res.status(500).json({ error: 'Failed to retrieve storage file collections.' });
  }
});

// 4. DELETE /api/admin/files/:filePath — Remove package from Storage
router.delete('/files/:filePath', async (req, res) => {
  const { filePath } = req.params;

  if (!filePath) {
    return res.status(400).json({ error: 'Storage filePath parameter is mandatory.' });
  }

  if (!isConfigured) {
    return res.status(200).json({ success: true, message: 'Local storage index cleared.' });
  }

  try {
    const fileRef = bucket.file(filePath);
    const [exists] = await fileRef.exists();

    if (exists) {
      await fileRef.delete();
    }

    // Remove matching index from uploaded_files database collection
    const fileRecords = await db.collection('uploaded_files')
      .where('filePath', '==', filePath)
      .get();

    const batch = db.batch();
    fileRecords.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.status(200).json({ success: true, message: 'File deleted from Storage and index records.' });
  } catch (error) {
    console.error('[ADMIN] Storage asset delete failure:', error);
    res.status(500).json({ error: 'Failed to erase package from storage.' });
  }
});

module.exports = router;
