
"use client";

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { 
  getAuth, 
  // connectAuthEmulator, // Keep emulators commented out for now
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  type User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  // connectFirestoreEmulator // Keep emulators commented out for now
} from 'firebase/firestore';

// Your web app's Firebase configuration from user
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCmVRTIvMTgZ_IBhzlc-Ml0yt106l0EyOk",
  authDomain: "bharatconnect-i8510.firebaseapp.com",
  projectId: "bharatconnect-i8510",
  storageBucket: "bharatconnect-i8510.appspot.com", // Corrected format
  messagingSenderId: "1011856991455",
  appId: "1:1011856991455:web:b8611aad228c31ccbf756a"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const firestore = getFirestore(app); // Initialize Firestore

// --- Emulator Connection (Comment out for production/live connection) ---
// const EMULATORS_STARTED = 'EMULATORS_STARTED';
// function SdkInit() {
//   if (typeof window !== 'undefined' && window.sessionStorage.getItem(EMULATORS_STARTED) === null) {
//     window.sessionStorage.setItem(EMULATORS_STARTED, 'true');
//     if (window.location.hostname === "localhost" && process.env.NODE_ENV === 'development') {
//       try {
//         console.warn(
//           "🔥 LOCAL DEVELOPMENT: Firebase Emulators should be running for Auth & Firestore. " +
//           "Ensure emulators are started: `firebase emulators:start`. " +
//           "Connecting to: Auth (127.0.0.1:9199), Firestore (127.0.0.1:8180)."
//         );
//         connectAuthEmulator(auth, "http://127.0.0.1:9199", { disableWarnings: true });
//         connectFirestoreEmulator(firestore, "127.0.0.1", 8180);
//         console.log("[Firebase Lib] Connected to Auth Emulator on 127.0.0.1:9199");
//         console.log("[Firebase Lib] Connected to Firestore Emulator on 127.0.0.1:8180");
//       } catch (error) {
//         console.error("[Firebase Lib] Error connecting to emulators:", error);
//       }
//     } else {
//       console.log("🔥 Firebase connected to LIVE services.");
//     }
//   }
// }
// SdkInit();
// --- End Emulator Connection ---


// Exported auth functions for use in components/pages
export const createUser = fbCreateUserWithEmailAndPassword;
export const signInUser = fbSignInWithEmailAndPassword;
export const signOutUser = () => fbSignOut(auth);
export const onAuthUserChanged = fbOnAuthStateChanged;
export const resetUserPassword = (email: string) => fbSendPasswordResetEmail(auth, email);

export { app, auth, firestore, type FirebaseUser }; // Export firestore
