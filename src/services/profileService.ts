
// Firebase services have been removed from this project.
// This file is kept as a placeholder.
// You will need to re-implement profile service logic
// if you re-integrate Firebase or another backend.

import { firestore } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc, type Timestamp } from 'firebase/firestore';

export interface BharatConnectFirestoreUser {
  uid: string; // UID from Firebase Auth, also the document ID
  email: string;
  displayName: string;
  photoURL?: string | null;
  phoneNumber?: string | null;
  bio?: string | null;
  onboardingComplete: boolean;
  languagePreference?: string; // Example, not yet implemented in UI
  status?: string; // Example, not yet implemented in UI
  currentAuraId?: string | null; // Example, not yet implemented in UI
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function createOrUpdateUserFullProfile(
  uid: string,
  profileData: {
    email: string;
    displayName: string;
    onboardingComplete: boolean;
    photoURL?: string | null;
    phoneNumber?: string | null;
    bio?: string | null;
  }
): Promise<void> {
  console.log(`[SVC_PROF] createOrUpdateUserFullProfile called for UID: ${uid}. Data:`, JSON.stringify(profileData));

  if (!uid) {
    console.error("[SVC_PROF] UID is missing in createOrUpdateUserFullProfile.");
    throw new Error("UID is required to create or update user profile.");
  }
  if (!firestore) {
    console.error("[SVC_PROF] Firestore instance is NOT AVAILABLE in createOrUpdateUserFullProfile!");
    throw new Error("Firestore is not initialized. Profile cannot be saved.");
  }

  const userDocRef = doc(firestore, 'users', uid);

  const dataToWrite = {
    uid: uid, // Storing UID within the document itself
    email: profileData.email,
    displayName: profileData.displayName,
    photoURL: profileData.photoURL || null,
    phoneNumber: profileData.phoneNumber || null,
    bio: profileData.bio || null,
    onboardingComplete: profileData.onboardingComplete,
    // languagePreference: 'en', // Default if not provided
    // status: 'Online', // Default if not provided
  };

  try {
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      // Document does not exist, create it with createdAt and updatedAt
      await setDoc(userDocRef, {
        ...dataToWrite,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`[SVC_PROF] User profile for ${uid} CREATED in Firestore.`);
    } else {
      // Document exists, update it, ensuring updatedAt is fresh
      await updateDoc(userDocRef, {
        ...dataToWrite, // This will update all fields provided in dataToWrite
        updatedAt: serverTimestamp(),
        // Note: createdAt is not touched here to preserve original creation time
      });
      console.log(`[SVC_PROF] User profile for ${uid} UPDATED in Firestore.`);
    }
  } catch (error)
{
    console.error(`[SVC_PROF] Error saving profile for ${uid} to Firestore:`, error);
    // Re-throw the error so the UI can catch it and display a message
    throw error;
  }
}

export async function getUserFullProfile(
  uid: string
): Promise<BharatConnectFirestoreUser | null> {
  console.warn(
    `[SVC_PROF] getUserFullProfile called for UID: ${uid}.`
  );
  if (!firestore) {
    console.error("[SVC_PROF] Firestore instance is not available for getUserFullProfile!");
    return null;
  }
  if (!uid) return null;

  try {
    const userDocRef = doc(firestore, 'users', uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      console.log(`[SVC_PROF] Profile found for ${uid}.`);
      return docSnap.data() as BharatConnectFirestoreUser;
    } else {
      console.log(`[SVC_PROF] No profile found for ${uid}.`);
      return null;
    }
  } catch (error) {
    console.error(`[SVC_PROF] Error fetching profile for ${uid}:`, error);
    return null;
  }
}
