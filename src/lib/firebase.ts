
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
// import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
// import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCmVRTIvMTgZ_IBhzlc-Ml0yt106l0EyOk",
  authDomain: "bharatconnect-i8510.firebaseapp.com",
  projectId: "bharatconnect-i8510",
  storageBucket: "bharatconnect-i8510.firebasestorage.app", 
  messagingSenderId: "1011856991455",
  appId: "1:1011856991455:web:b8611aad228c31ccbf756a"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);
// const functions = getFunctions(app);
// const storage = getStorage(app);

if (process.env.NODE_ENV === 'development') {
  console.info(
    '[Firebase Lib] Development mode. REMINDER: Ensure Firebase Emulators are running via "firebase emulators:start".'
  );
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    console.log('[Firebase Lib] Connected to Auth Emulator on port 9099.');
  } catch (e) {
    console.warn('[Firebase Lib] Failed to connect to Auth Emulator. Is it running? Error:', e);
  }

  try {
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    console.log('[Firebase Lib] Connected to Firestore Emulator on port 8080.');
  } catch (e) {
    console.warn('[Firebase Lib] Failed to connect to Firestore Emulator. Is it running? Error:', e);
  }

  // Example for Functions emulator (if you use it):
  // try {
  //   connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  //   console.log('[Firebase Lib] Connected to Functions Emulator on port 5001.');
  // } catch (e) {
  //   console.warn('[Firebase Lib] Failed to connect to Functions Emulator. Is it running? Error:', e);
  // }

  // Example for Storage emulator (if you use it):
  // try {
  //   connectStorageEmulator(storage, '127.0.0.1', 9199);
  //   console.log('[Firebase Lib] Connected to Storage Emulator on port 9199.');
  // } catch (e) {
  //   console.warn('[Firebase Lib] Failed to connect to Storage Emulator. Is it running? Error:', e);
  // }
} else {
  console.log('[Firebase Lib] Production mode or emulators not configured for this environment.');
}

export { app, auth, firestore /*, functions, storage */ };
