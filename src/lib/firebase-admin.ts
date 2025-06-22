
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This pattern ensures that the SDK is initialized only once.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // When running in a Google Cloud environment like App Hosting,
      // the SDK automatically detects service account credentials.
      // We just need to provide the storage bucket.
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error', error.stack);
  }
}

const firestoreAdmin = admin.firestore();
const storageAdmin = admin.storage();
const authAdmin = admin.auth();

export { firestoreAdmin, storageAdmin, authAdmin };
export default admin;
