
"use client";

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator, 
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  type User as FirebaseUser
} from 'firebase/auth';
// import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'; // Firestore not part of this step yet

// Your web app's Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCmVRTIvMTgZ_IBhzlc-Ml0yt106l0EyOk",
  authDomain: "bharatconnect-i8510.firebaseapp.com",
  projectId: "bharatconnect-i8510",
  storageBucket: "bharatconnect-i8510.appspot.com", // Corrected from your plan's .firebasestorage.app
  messagingSenderId: "1011856991455",
  appId: "1:1011856991455:web:b8611aad228c31ccbf756a"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
// const firestore = getFirestore(app); // Firestore not part of this step yet

// --- Emulator Connection (Comment out for production/live connection) ---
// Make sure these ports match your firebase.json emulator configuration
// if (typeof window !== 'undefined' && window.location.hostname === "localhost" && process.env.NODE_ENV === 'development') {
//   try {
//     console.log("[Firebase Lib] Connecting to Auth Emulator on 127.0.0.1:9099");
//     connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
//     // console.log("[Firebase Lib] Connecting to Firestore Emulator on 127.0.0.1:8080");
//     // connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
//     console.warn(
//       "🔥 Firebase Emulators are configured for local development. " +
//       "Ensure emulators are running: `firebase emulators:start`. " +
//       "For production, comment out connectAuthEmulator/connectFirestoreEmulator."
//     );
//   } catch (error) {
//     console.error("[Firebase Lib] Error connecting to emulators:", error);
//   }
// } else {
//    console.log("🔥 Firebase connected to LIVE services.");
// }
// --- End Emulator Connection ---

// Authentication functions (as per your plan)
export const createUserWithEmailAndPassword = fbCreateUserWithEmailAndPassword;
export const signInWithEmailAndPassword = fbSignInWithEmailAndPassword;
export const signOut = fbSignOut;
export const onAuthStateChanged = fbOnAuthStateChanged;
export const sendPasswordResetEmail = fbSendPasswordResetEmail;

export { app, auth, type FirebaseUser }; // Export firestore later when re-integrated
