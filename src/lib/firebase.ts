
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
// import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
// import { getStorage, connectStorageEmulator } from 'firebase/storage';

// This configuration will now be driven by environment variables
// Ensure your .env file has the correct values for bharatconnect-i8510
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);
// const functions = getFunctions(app);
// const storage = getStorage(app);

// Emulator settings (uncomment if using Firebase Emulators)
// if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
//   // Make sure emulators are running before uncommenting.
//   // connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//   // connectFirestoreEmulator(firestore, 'localhost', 8080);
//   // connectFunctionsEmulator(functions, 'localhost', 5001);
//   // connectStorageEmulator(storage, 'localhost', 9199);
// }

export { app, auth, firestore /*, functions, storage */ };
