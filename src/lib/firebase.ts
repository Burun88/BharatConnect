
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

// Emulator settings (uncomment if using Firebase Emulators)
// if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
//   // Make sure emulators are running before uncommenting.
//   // connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//   // connectFirestoreEmulator(firestore, 'localhost', 8080);
//   // connectFunctionsEmulator(functions, 'localhost', 5001);
//   // connectStorageEmulator(storage, 'localhost', 9199);
// }

export { app, auth, firestore /*, functions, storage */ };
