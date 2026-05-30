/**
 * Router managing catalog products and admin CRUD features.
 */

const express = require('express');
const router = express.Router();
const { db, isConfigured } = require('../config/firebase');
const { verifyAdmin } = require('../middleware/adminAuth');

const MOCK_PRODUCTS = [
  { id: '1', name: 'Android RAT Panel', description: 'Advanced remote administration tool for Android devices with real-time logging, location tracking, and visual commands.', price: 49, category: 'Android Panel', imageUrl: null, filePath: 'products/panel-files/android-rat-v2.1.zip', active: true },
  { id: '2', name: 'Android SMS Gateway', description: 'Bulk SMS automation dashboard with support for schedules, REST APIs, and carrier log exports.', price: 35, category: 'Android Panel', imageUrl: null, filePath: '', active: true },
  { id: '3', name: 'iOS MDM Controller', description: 'Mobile device configuration profiles manager to deploy system parameters, lock devices, and push policies.', price: 79, category: 'iOS Panel', imageUrl: null, filePath: 'products/panel-files/ios-mdm-v1.5.zip', active: true },
  { id: '4', name: 'iOS Push Manager', description: 'Advanced Apple Push Notification service dashboard with custom payloads, segmentation, and batch delivery.', price: 45, category: 'iOS Panel', imageUrl: null, filePath: '', active: true },
  { id: '5', name: 'PC Remote Admin', description: 'Extremely fast desktop streaming framework with encrypted command shells, processes managers, and file systems.', price: 59, category: 'PC Panel', imageUrl: null, filePath: 'products/panel-files/pc-remote-v3.0.zip', active: true },
  { id: '6', name: 'PC Network Monitor', description: 'Real-time PC network interface analyzer with packet capture, bandwidth graphs, and suspicious IP triggers.', price: 39, category: 'PC Panel', imageUrl: null, filePath: '', active: true }
];

// Memory catalog storage for offline local sandbox testing
let localProducts = [...MOCK_PRODUCTS];

// 1. GET /api/products — Fetch active catalog products
router.get('/', async (req, res) => {
  if (!isConfigured) {
    return res.status(200).json(localProducts.filter(p => p.active));
  }

  try {
    const checkEmptySnapshot = await db.collection('products').limit(1).get();
    if (checkEmptySnapshot.empty) {
      console.log('[PRODUCTS] Firestore products collection is empty. Seeding initial catalog...');
      const batch = db.batch();
      MOCK_PRODUCTS.forEach(prod => {
        const docRef = db.collection('products').doc(prod.id);
        const { id, ...prodData } = prod;
        batch.set(docRef, {
          ...prodData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      console.log('[PRODUCTS] Initial catalog successfully seeded to Firestore.');
    }

    const snapshot = await db.collection('products')
      .where('active', '==', true)
      .get();

    const list = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json(list.length > 0 ? list : localProducts.filter(p => p.active));
  } catch (error) {
    console.error('[PRODUCTS] Fetch error:', error);
    res.status(200).json(localProducts.filter(p => p.active));
  }
});

// 2. POST /api/products — Create new product record (Admin privilege)
router.post('/', verifyAdmin, async (req, res) => {
  const { name, description, category, price, filePath, active, imageUrl } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Name and price are required parameters.' });
  }

  const payload = {
    name,
    description: description || '',
    category: category || 'Android Panel',
    price: Number(price),
    filePath: filePath || '',
    imageUrl: imageUrl || null,
    active: active !== undefined ? active : true,
    updatedAt: new Date().toISOString()
  };

  if (!isConfigured) {
    const localNew = { id: Math.random().toString(36).substring(2, 9), ...payload, createdAt: new Date().toISOString() };
    localProducts.unshift(localNew);
    return res.status(201).json(localNew);
  }

  try {
    payload.createdAt = new Date().toISOString();
    const docRef = await db.collection('products').add(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error('[PRODUCTS] Create error:', error);
    res.status(500).json({ error: 'Failed to create product database entry.' });
  }
});

// 3. PUT /api/products/:id — Modify product record (Admin privilege)
//
// filePath update behaviour:
//   - If the request body includes a "filePath" key (even an empty string),
//     the value is written to Firestore — the admin explicitly wants to change it.
//   - If the request body does NOT include "filePath" at all (key is undefined),
//     the field is left untouched in Firestore — preserving the existing link.
//
// The frontend only sends "filePath" when the admin toggles "Updating link" in the UI.
router.put('/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, category, price, filePath, active, imageUrl } = req.body;

  // Build payload with only the fields that were actually sent
  const payload = {
    updatedAt: new Date().toISOString()
  };

  if (name !== undefined)        payload.name        = name;
  if (description !== undefined) payload.description = description;
  if (category !== undefined)    payload.category    = category;
  if (price !== undefined)       payload.price       = Number(price);
  if (active !== undefined)      payload.active      = active;
  if (imageUrl !== undefined)    payload.imageUrl    = imageUrl || null;

  // filePath is only added to the payload when the frontend explicitly sends it.
  // This prevents accidental erasure when the admin saves without touching the link field.
  if (filePath !== undefined) {
    payload.filePath = filePath; // could be '' if admin intentionally cleared it
    console.log(`[PRODUCTS] filePath update requested for product ${id}: "${filePath}"`);
  } else {
    console.log(`[PRODUCTS] filePath NOT in request for product ${id} — preserving existing value.`);
  }

  if (!isConfigured) {
    const idx = localProducts.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Product profile not found.' });
    localProducts[idx] = { ...localProducts[idx], ...payload };
    return res.status(200).json(localProducts[idx]);
  }

  try {
    const docRef = db.collection('products').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Product profile not found.' });
    }

    // Firestore .update() only touches fields present in payload — existing
    // fields not in payload (including filePath when not sent) are untouched.
    await docRef.update(payload);
    res.status(200).json({ id, ...payload });
  } catch (error) {
    console.error('[PRODUCTS] Update error:', error);
    res.status(500).json({ error: 'Failed to update product details.' });
  }
});

// 4. DELETE /api/products/:id — Soft-delete product record (Admin privilege)
router.delete('/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  if (!isConfigured) {
    localProducts = localProducts.filter(p => p.id !== id);
    return res.status(200).json({ success: true, message: 'Local catalog index cleared.' });
  }

  try {
    const docRef = db.collection('products').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Product profile not found.' });
    }

    // Soft delete to preserve purchase records/license links
    await docRef.update({ active: false, updatedAt: new Date().toISOString() });
    res.status(200).json({ success: true, message: 'Product profile set inactive.' });
  } catch (error) {
    console.error('[PRODUCTS] Delete error:', error);
    res.status(500).json({ error: 'Failed to deactivate product profile.' });
  }
});

module.exports = router;