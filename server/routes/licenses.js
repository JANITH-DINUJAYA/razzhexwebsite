/**
 * Router managing licenses, admin controls, and public validations.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, isConfigured, admin } = require('../config/firebase');
const { verifyAdmin } = require('../middleware/adminAuth');
const { licenseLimiter } = require('../middleware/rateLimiter');
const { generateLicenseKey, hashKey } = require('../utils/generateKey');

const JWT_SECRET = process.env.JWT_SECRET || 'razz-hex-deepmind-masterkey';

// Mock memory databases for local development
let localLicenses = [
  { id: 'l1', key: 'RAZZ-9F82-K10A-7B5D', keyHash: hashKey('RAZZ-9F82-K10A-7B5D'), productId: '1', productName: 'Android RAT Panel', status: 'active', activatedDevices: 1, maxDevices: 1, deviceFingerprints: ['fp_test_device'], createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30*24*60*60*1000).toISOString() },
  { id: 'l2', key: 'RAZZ-8A01-C91F-3D2E', keyHash: hashKey('RAZZ-8A01-C91F-3D2E'), productId: '3', productName: 'iOS MDM Controller', status: 'active', activatedDevices: 0, maxDevices: 1, deviceFingerprints: [], createdAt: new Date().toISOString(), expiresAt: null },
  { id: 'l3', key: 'RAZZ-6C4D-7E8F-9A0B', keyHash: hashKey('RAZZ-6C4D-7E8F-9A0B'), productId: '5', productName: 'PC Remote Admin', status: 'expired', activatedDevices: 1, maxDevices: 1, deviceFingerprints: ['fp_old_pc'], createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() - 5*24*60*60*1000).toISOString() }
];

// 1. POST /api/licenses/validate — Public Verification Portal (with licenseLimiter)
router.post('/validate', licenseLimiter, async (req, res) => {
  const { licenseKey, deviceFingerprint, deviceName } = req.body;

  if (!licenseKey || !deviceFingerprint) {
    return res.status(400).json({ error: 'License key and device fingerprint hash are required.' });
  }

  const incomingHash = hashKey(licenseKey);

  // Fallback offline handler
  if (!isConfigured) {
    console.log('[LICENSE BYPASS] Running validation logic locally.');
    const match = localLicenses.find(l => l.keyHash === incomingHash);
    
    if (!match) {
      return res.status(403).json({ error: 'Invalid license key.' });
    }

    // Check expiration on-the-fly
    if (match.expiresAt && new Date(match.expiresAt) < new Date()) {
      match.status = 'expired';
    }

    if (match.status !== 'active') {
      return res.status(403).json({ error: `License verification failed. Status: ${match.status}` });
    }

    // 1-device restriction check
    if (match.deviceFingerprints.length > 0 && !match.deviceFingerprints.includes(deviceFingerprint)) {
      if (match.activatedDevices >= match.maxDevices) {
        return res.status(403).json({ error: 'Device limit reached. License already active on another machine.' });
      }
      match.deviceFingerprints.push(deviceFingerprint);
      match.activatedDevices += 1;
    } else if (match.deviceFingerprints.length === 0) {
      match.deviceFingerprints.push(deviceFingerprint);
      match.activatedDevices = 1;
    }

    // Generate session JWT token
    const token = jwt.sign(
      {
        licenseId: match.id,
        productId: match.productId,
        deviceFingerprint: deviceFingerprint
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      success: true,
      token,
      productId: match.productId,
      productName: match.productName
    });
  }

  try {
    // ----------------------------------------------------
    // Strict Transaction lock verifying 1 device parameters
    // ----------------------------------------------------
    console.log(`[LICENSE] Validating licenseKey: "${licenseKey}" (Hash: ${incomingHash})`);

    let licenseRefQuery = await db.collection('licenses')
      .where('keyHash', '==', incomingHash)
      .limit(1)
      .get();

    // Fallback: Query by plain-text key if hash lookup returns empty (e.g., manually created database entries)
    if (licenseRefQuery.empty) {
      const sanitizedKey = licenseKey.trim().toUpperCase();
      console.log(`[LICENSE] No keyHash match. Trying plain-text fallback: "${sanitizedKey}"`);
      
      licenseRefQuery = await db.collection('licenses')
        .where('key', '==', sanitizedKey)
        .limit(1)
        .get();

      // Additional fallback: Query without dashes
      if (licenseRefQuery.empty) {
        const cleanKey = sanitizedKey.replace(/-/g, '');
        console.log(`[LICENSE] No plain-text match with dashes. Trying without dashes: "${cleanKey}"`);
        
        licenseRefQuery = await db.collection('licenses')
          .where('key', '==', cleanKey)
          .limit(1)
          .get();
      }
    }

    if (licenseRefQuery.empty) {
      console.warn(`[LICENSE] Verification failed. License key "${licenseKey}" not found in Firestore.`);
      return res.status(403).json({ error: 'License key invalid. Document not found.' });
    }

    console.log(`[LICENSE] License document found successfully.`);

    const docId = licenseRefQuery.docs[0].id;
    const licenseRef = db.collection('licenses').doc(docId);
    
    let productId = '';
    let productName = '';
    
    const resultToken = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(licenseRef);
      if (!doc.exists) {
        throw new Error('LICENSE_NOT_FOUND');
      }

      const lic = doc.data();
      productId = lic.productId;
      productName = lic.productName || 'Secure Digital Package';

      // Check for expiration
      if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) {
        transaction.update(licenseRef, {
          status: 'expired',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        throw new Error('STATUS_INVALID_expired');
      }

      if (lic.status !== 'active') {
        throw new Error(`STATUS_INVALID_${lic.status}`);
      }

      // Check device array
      const devices = lic.deviceFingerprints || [];
      const index = devices.indexOf(deviceFingerprint);

      if (index === -1) {
        // Device is new, verify maximum restrictions (default limit = 1)
        const limit = lic.maxDevices || 1;
        // Use actual fingerprint array length as source of truth (not the stored counter
        // which can get out-of-sync with the real registered device list)
        const currentCount = devices.length;

        if (currentCount >= limit) {
          throw new Error('DEVICE_LIMIT_REACHED');
        }

        // Register device, sync counters in Firestore atomically
        // Set activatedDevices explicitly to keep it in sync with actual array length
        transaction.update(licenseRef, {
          deviceFingerprints: admin.firestore.FieldValue.arrayUnion(deviceFingerprint),
          activatedDevices: devices.length + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log device specifics in activations collection
        const activationLogRef = licenseRef.collection('activations').doc(deviceFingerprint);
        transaction.set(activationLogRef, {
          fingerprint: deviceFingerprint,
          deviceName: deviceName || 'Web Browser',
          activatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSeenAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Device already authorized, update lastSeen timestamp
        const activationLogRef = licenseRef.collection('activations').doc(deviceFingerprint);
        transaction.update(activationLogRef, {
          lastSeenAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Sign JWT session token
      const sessionJwt = jwt.sign(
        {
          licenseId: docId,
          productId: lic.productId,
          deviceFingerprint: deviceFingerprint
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      return sessionJwt;
    });

    return res.status(200).json({
      success: true,
      token: resultToken,
      productId,
      productName
    });

  } catch (error) {
    console.error('[LICENSE] Transaction validation failed:', error);
    
    if (error.message === 'LICENSE_NOT_FOUND') {
      return res.status(403).json({ error: 'License key invalid.' });
    }
    if (error.message.startsWith('STATUS_INVALID_')) {
      const status = error.message.replace('STATUS_INVALID_', '');
      return res.status(403).json({ error: `Verification failed. License status: ${status}` });
    }
    if (error.message === 'DEVICE_LIMIT_REACHED') {
      return res.status(403).json({ error: 'Device limit reached. License already active on another machine.' });
    }

    res.status(500).json({ error: 'Session transaction collapsed.' });
  }
});

// 2. POST /api/licenses/generate — Bulk key generator (Admin only)
router.post('/generate', verifyAdmin, async (req, res) => {
  const { productId, maxDevices, count, expiresAt } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'Product association parameter is required.' });
  }

  const keysCount = Math.min(Number(count) || 1, 50);
  const limitDevices = Number(maxDevices) || 1; // Strict limit: 1
  const generatedKeysList = [];

  for (let i = 0; i < keysCount; i++) {
    generatedKeysList.push(generateLicenseKey());
  }

  if (!isConfigured) {
    const mockNew = generatedKeysList.map((key, i) => {
      const newKeyDoc = {
        id: `local-gen-${Math.random()}-${i}`,
        key,
        keyHash: hashKey(key),
        productId,
        productName: 'Associated Digital Product',
        status: 'active',
        activatedDevices: 0,
        maxDevices: limitDevices,
        deviceFingerprints: [],
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
      };
      localLicenses.unshift(newKeyDoc);
      return newKeyDoc;
    });
    return res.status(201).json({ keys: generatedKeysList, records: mockNew });
  }

  try {
    // Resolve associated product name first
    const prodDoc = await db.collection('products').doc(productId).get();
    const productName = prodDoc.exists ? prodDoc.data().name : 'Secure Digital Package';

    const batch = db.batch();

    generatedKeysList.forEach(key => {
      const docRef = db.collection('licenses').doc();
      batch.set(docRef, {
        key,
        keyHash: hashKey(key),
        productId,
        productName,
        status: 'active',
        activatedDevices: 0,
        maxDevices: limitDevices,
        deviceFingerprints: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
      });
    });

    await batch.commit();
    res.status(201).json({ keys: generatedKeysList });
  } catch (error) {
    console.error('[LICENSE] Generation failed:', error);
    res.status(500).json({ error: 'Failed to commit license keys batch.' });
  }
});

// 3. GET /api/licenses — List all keys (Admin only)
router.get('/', verifyAdmin, async (req, res) => {
  if (!isConfigured) {
    return res.status(200).json(localLicenses);
  }

  try {
    const snapshot = await db.collection('licenses')
      .orderBy('createdAt', 'desc')
      .get();

    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(list.length > 0 ? list : localLicenses);
  } catch (error) {
    console.error('[LICENSE] List fetch error:', error);
    res.status(200).json(localLicenses);
  }
});

// 4. PUT /api/licenses/:id/revoke — Instantly revoke license key (Admin only)
router.put('/:id/revoke', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  if (!isConfigured) {
    const idx = localLicenses.findIndex(l => l.id === id);
    if (idx === -1) return res.status(404).json({ error: 'License record not found.' });
    localLicenses[idx].status = 'revoked';
    return res.status(200).json(localLicenses[idx]);
  }

  try {
    const docRef = db.collection('licenses').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'License record not found.' });
    }

    await docRef.update({ status: 'revoked', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.status(200).json({ success: true, message: 'License key revoked successfully.' });
  } catch (error) {
    console.error('[LICENSE] Revoke error:', error);
    res.status(500).json({ error: 'Failed to revoke key document.' });
  }
});

// 5. DELETE /api/licenses/:id — Permanently delete license key document (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  if (!isConfigured) {
    localLicenses = localLicenses.filter(l => l.id !== id);
    return res.status(200).json({ success: true, message: 'Local license record removed.' });
  }

  try {
    const docRef = db.collection('licenses').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'License record not found.' });
    }

    await docRef.delete();
    res.status(200).json({ success: true, message: 'License record deleted permanently.' });
  } catch (error) {
    console.error('[LICENSE] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete license key document.' });
  }
});

module.exports = router;
