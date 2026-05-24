/**
 * Firebase Admin SDK Initialization config.
 * Reads credentials file or env variables.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let db = null;
let bucket = null;
let adminAuth = null;
let isConfigured = false;

try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || './serviceAccountKey.json';
  const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);

  let credentialsObj = null;

  if (fs.existsSync(resolvedPath)) {
    credentialsObj = require(resolvedPath);
    console.log(`[FIREBASE] Service account key found at ${resolvedPath}. Initializing SDK...`);
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    console.log(`[FIREBASE] Service account credentials found in environment. Initializing SDK...`);
    credentialsObj = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    };
  }

  if (credentialsObj) {
    const initOptions = {
      credential: admin.credential.cert(credentialsObj),
    };

    if (process.env.FIREBASE_STORAGE_BUCKET) {
      initOptions.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
    } else if (credentialsObj.storageBucket) {
      initOptions.storageBucket = credentialsObj.storageBucket;
    } else {
      initOptions.storageBucket = `${credentialsObj.projectId}.appspot.com`;
    }

    admin.initializeApp(initOptions);
    
    db = admin.firestore();
    bucket = admin.storage().bucket();
    adminAuth = admin.auth();
    isConfigured = true;
    
    console.log(`[FIREBASE] Admin SDK successfully initialized for project: ${credentialsObj.projectId}`);
    console.log(`[FIREBASE] Storage bucket target: ${initOptions.storageBucket}`);
  } else {
    console.warn('[FIREBASE] No serviceAccountKey.json or credentials environment variables found. System running in OFFLINE/DEMO fallback mode.');
  }
} catch (error) {
  console.error('[FIREBASE] Error initializing Firebase Admin SDK:', error);
  console.warn('[FIREBASE] Fallback mock database initialized. Endpoints will bypass remote writes.');
}

module.exports = {
  admin,
  db,
  bucket,
  adminAuth,
  isConfigured
};
