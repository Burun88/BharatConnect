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

if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    !process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    !process.env.NEXT_PUBLIC_FIREBASE_APP_ID) {
    throw new Error("Firebase configuration environment variables are not set. Please check your .env file.");
}

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
