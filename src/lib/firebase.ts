
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
// import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
// import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Configuration for the 'instabharat' Firebase project
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDkIGQGl4YCxkiNQAv_p2jMQW4tevkIbqs",
  authDomain: "instabharat.firebaseapp.com",
  projectId: "instabharat",
  storageBucket: "instabharat.firebasestorage.app",
  messagingSenderId: "821735960861",
  appId: "1:821735960861:web:4b19da159f891bc128f1f4"
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

