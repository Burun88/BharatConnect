
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
// import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
// import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Directly using the provided Firebase configuration for bharatconnect-i8510
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCmVRTIvMTgZ_IBhzlc-Ml0yt106l0EyOk",
  authDomain: "bharatconnect-i8510.firebaseapp.com",
  projectId: "bharatconnect-i8510",
  storageBucket: "bharatconnect-i8510.firebasestorage.app", // Corrected from .firebasestorage.app to .appspot.com if that's your actual bucket
  messagingSenderId: "1011856991455",
  appId: "1:1011856991455:web:b8611aad228c31ccbf756a"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);
// const functions = getFunctions(app);
// const storage = getStorage(app);

// Emulator settings
// IMPORTANT: Only connect to emulators in a development environment.
// process.env.NODE_ENV is set by Next.js ('development', 'production', 'test')
if (process.env.NODE_ENV === 'development') {
  // It's good practice to ensure these only run client-side or in Node.js dev environments
  // where `window` might not be defined but you still want to connect.
  // For Next.js, this file can be bundled for both client and server.
  // The `connect` functions are safe to call multiple times but only connect once.

  console.log('[Firebase Lib] Development mode detected. Attempting to connect to emulators.');
  
  // Check if already connected to avoid errors, though connectXEmulator is generally idempotent.
  // However, Next.js fast refresh can sometimes cause issues if not careful.
  // A simple way to manage this is to connect only if not already connected,
  // which can be tricky to check directly. For now, we rely on idempotency.

  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    console.log('[Firebase Lib] Connected to Auth Emulator on port 9099.');
  } catch (e) {
    console.warn('[Firebase Lib] Failed to connect to Auth Emulator. Is it running?', e);
  }

  try {
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    console.log('[Firebase Lib] Connected to Firestore Emulator on port 8080.');
  } catch (e) {
    console.warn('[Firebase Lib] Failed to connect to Firestore Emulator. Is it running?', e);
  }

  // If you enabled Functions emulator:
  // try {
  //   connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  //   console.log('[Firebase Lib] Connected to Functions Emulator on port 5001.');
  // } catch (e) {
  //   console.warn('[Firebase Lib] Failed to connect to Functions Emulator. Is it running?', e);
  // }

  // If you enabled Storage emulator:
  // try {
  //   connectStorageEmulator(storage, '127.0.0.1', 9199);
  //   console.log('[Firebase Lib] Connected to Storage Emulator on port 9199.');
  // } catch (e) {
  //   console.warn('[Firebase Lib] Failed to connect to Storage Emulator. Is it running?', e);
  // }
} else {
  console.log('[Firebase Lib] Production mode or emulators not configured for this environment.');
}

export { app, auth, firestore /*, functions, storage */ };
