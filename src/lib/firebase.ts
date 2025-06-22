
// "use client"; // Removed to allow server-side usage in Server Actions

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  type User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  Timestamp, // Import Timestamp
  serverTimestamp // Import serverTimestamp directly
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCmVRTIvMTgZ_IBhzlc-Ml0yt106l0EyOk",
  authDomain: "bharatconnect-i8510.firebaseapp.com",
  projectId: "bharatconnect-i8510",
  storageBucket: "bharatconnect-i8510.firebasestorage.app",
  messagingSenderId: "1011856991455",
  appId: "1:1011856991455:web:b8611aad228c31ccbf756a"
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const firestore = getFirestore(app); 
const storage = getStorage(app);

export const createUser = fbCreateUserWithEmailAndPassword;
export const signInUser = fbSignInWithEmailAndPassword;
export const signOutUser = () => fbSignOut(auth);
export const onAuthUserChanged = fbOnAuthStateChanged;
export const resetUserPassword = (email: string) => fbSendPasswordResetEmail(auth, email);

// Deprecated: Use getFirebaseTimestampMinutesAgo instead for flexibility
export function getOneHourAgoFirebaseTimestamp(): Timestamp {
  const d = new Date();
  d.setHours(d.getHours() - 1);
  return Timestamp.fromDate(d);
}

export function getFirebaseTimestampMinutesAgo(minutes: number): Timestamp {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return Timestamp.fromDate(d);
}

export { app, auth, firestore, storage, type FirebaseUser, Timestamp, serverTimestamp };
