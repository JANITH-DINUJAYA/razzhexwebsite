/**
 * Admin authorization token verification middleware.
 */

const { adminAuth, db, isConfigured, admin } = require('../config/firebase');

async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header not found or format invalid (Bearer token).' });
  }

  const token = authHeader.split('Bearer ')[1];

  // If Firebase is not fully configured yet, let dev tests bypass auth to verify frontend styling
  if (!isConfigured) {
    console.log('[AUTH BYPASS] Admin request received, bypassing checks due to offline fallback mode.');
    req.admin = { uid: 'dev-bypass-uid', email: 'admin@razzhex.com', role: 'developer' };
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Verify admin privileges record in Firestore
    const adminDoc = await db.collection('admins').doc(decodedToken.uid).get();
    
    if (!adminDoc.exists) {
      // For initial setup ease: if there are zero admins in the collection,
      // we allow the first logged in user to pass and register as admin, or simply pass
      const adminsCountRef = await db.collection('admins').limit(1).get();
      if (adminsCountRef.empty) {
        console.warn(`[AUTH] Admin collection empty. Auto-registering UID ${decodedToken.uid} as initial supervisor.`);
        await db.collection('admins').doc(decodedToken.uid).set({
          email: decodedToken.email,
          role: 'superadmin',
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        req.admin = { uid: decodedToken.uid, email: decodedToken.email, role: 'superadmin' };
        return next();
      }

      return res.status(403).json({ error: 'Access denied. Account is not registered in administrative index.' });
    }

    const adminData = adminDoc.data();
    if (!adminData.isActive) {
      return res.status(403).json({ error: 'Access denied. Administrative profile has been suspended.' });
    }

    req.admin = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: adminData.role || 'admin',
    };

    next();
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error);
    return res.status(401).json({ error: 'Session expired or token signature invalid.' });
  }
}

module.exports = {
  verifyAdmin
};
