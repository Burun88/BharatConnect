
// Firebase services have been removed from this project.
// This file is kept as a placeholder.
// You will need to re-implement profile service logic
// if you re-integrate Firebase or another backend.

import { firestore } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc, type Timestamp } from 'firebase/firestore';

export interface BharatConnectFirestoreUser {
  id: string; // Document ID (user's auth UID) is also stored as a field named 'id'
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
  uid: string, // This is the auth UID, and will be the document ID
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

  // Use 'bharatConnectUsers' collection as per the new rules
  const userDocRef = doc(firestore, 'bharatConnectUsers', uid);

  const dataToWrite: Omit<BharatConnectFirestoreUser, 'createdAt' | 'updatedAt'> = {
    id: uid, // Storing UID as 'id' field to match rule: request.resource.data.id == userId
    email: profileData.email,
    displayName: profileData.displayName,
    photoURL: profileData.photoURL || null,
    phoneNumber: profileData.phoneNumber || null,
    bio: profileData.bio || null,
    onboardingComplete: profileData.onboardingComplete, // This should be true as per rule
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
      console.log(`[SVC_PROF] User profile for ${uid} CREATED in Firestore collection 'bharatConnectUsers'.`);
    } else {
      // Document exists, update it, ensuring updatedAt is fresh
      // Fields that should not change on update (like id, email, createdAt) are checked by rules
      await updateDoc(userDocRef, {
        // Only update fields that are allowed to change
        displayName: dataToWrite.displayName,
        photoURL: dataToWrite.photoURL,
        phoneNumber: dataToWrite.phoneNumber,
        bio: dataToWrite.bio,
        onboardingComplete: dataToWrite.onboardingComplete, // Rule enforces this must be true
        // Other fields like languagePreference, status, currentAuraId could be updated here if needed
        updatedAt: serverTimestamp(),
      });
      console.log(`[SVC_PROF] User profile for ${uid} UPDATED in Firestore collection 'bharatConnectUsers'.`);
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
    // Use 'bharatConnectUsers' collection
    const userDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      console.log(`[SVC_PROF] Profile found for ${uid} in 'bharatConnectUsers'.`);
      return docSnap.data() as BharatConnectFirestoreUser;
    } else {
      console.log(`[SVC_PROF] No profile found for ${uid} in 'bharatConnectUsers'.`);
      return null;
    }
  } catch (error) {
    console.error(`[SVC_PROF] Error fetching profile for ${uid} from 'bharatConnectUsers':`, error);
    return null;
  }
}
