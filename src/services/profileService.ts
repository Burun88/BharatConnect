
// Firebase services have been removed from this project.
// This file is kept as a placeholder.
// You will need to re-implement profile service logic
// if you re-integrate Firebase or another backend.

import { auth, firestore } from '@/lib/firebase'; // Ensure auth is imported
import { doc, setDoc, serverTimestamp, getDoc, updateDoc, type Timestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth'; // Import updateProfile

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

  const userDocRef = doc(firestore, 'bharatConnectUsers', uid);

  // Data for Firestore
  const firestoreData: Omit<BharatConnectFirestoreUser, 'createdAt' | 'updatedAt'> = {
    id: uid, 
    email: profileData.email,
    displayName: profileData.displayName,
    photoURL: profileData.photoURL !== undefined ? profileData.photoURL : null, // Ensure null if undefined
    phoneNumber: profileData.phoneNumber !== undefined ? profileData.phoneNumber : null,
    bio: profileData.bio !== undefined ? profileData.bio : null,
    onboardingComplete: profileData.onboardingComplete,
  };

  // Data for Firebase Auth update
  const authProfileUpdate: { displayName?: string; photoURL?: string | null } = {};
  if (profileData.displayName) { // Only add if displayName is truthy (not null, undefined, or empty string)
    authProfileUpdate.displayName = profileData.displayName;
  }
  // Allow explicit setting of photoURL to null, or a new URL
  if (profileData.photoURL !== undefined) { 
    authProfileUpdate.photoURL = profileData.photoURL;
  }


  try {
    // 1. Update Firestore document
    const docSnap = await getDoc(userDocRef);
    const dataForFirestoreOperation = { ...firestoreData }; // Create a mutable copy

    if (!docSnap.exists()) {
      await setDoc(userDocRef, {
        ...dataForFirestoreOperation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`[SVC_PROF] User profile for ${uid} CREATED in Firestore collection 'bharatConnectUsers'.`);
    } else {
      // For updates, remove id and email from the direct update payload if they are not meant to be changed by this function
      // or ensure rules prevent their modification if they are part of a general spread.
      // However, spreading firestoreData (which includes id and email) is common for simplicity if rules handle immutability.
      await updateDoc(userDocRef, {
        ...dataForFirestoreOperation, 
        updatedAt: serverTimestamp(),
      });
      console.log(`[SVC_PROF] User profile for ${uid} UPDATED in Firestore collection 'bharatConnectUsers'.`);
    }

    // 2. Update Firebase Auth user profile
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      // Determine if an Auth update is needed
      const needsAuthUpdate = 
        (authProfileUpdate.displayName && authProfileUpdate.displayName !== currentUser.displayName) ||
        (authProfileUpdate.photoURL !== undefined && authProfileUpdate.photoURL !== currentUser.photoURL);

      if (needsAuthUpdate) {
        await updateProfile(currentUser, authProfileUpdate);
        console.log(`[SVC_PROF] Firebase Auth profile updated for UID: ${uid}. Name: ${authProfileUpdate.displayName}, Photo: ${authProfileUpdate.photoURL}`);
      } else {
        console.log(`[SVC_PROF] Firebase Auth profile for UID: ${uid} already up-to-date or no changes requested for displayName/photoURL. No update call needed.`);
      }
    } else {
      console.warn(`[SVC_PROF] Cannot update Firebase Auth profile: currentUser is null or UID mismatch. CurrentAuthUID: ${currentUser?.uid}, TargetUID: ${uid}`);
    }

  } catch (error) {
    console.error(`[SVC_PROF] Error saving/updating profile for ${uid}:`, error);
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
