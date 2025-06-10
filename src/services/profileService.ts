
'use server';

import { app, firestore } from '@/lib/firebase'; // app is needed to re-get auth
import { getAuth as getClientAuth } from 'firebase/auth'; // Client SDK for use in server action
import { doc, getDoc, setDoc, serverTimestamp,FieldValue } from 'firebase/firestore';

/**
 * @fileOverview Service functions for managing BharatConnect user profiles.
 * - BharatConnectUser: Full user profile for BharatConnect.
 * - createOrUpdateUserFullProfile: Manages the full profile in '/bharatConnectUsers'.
 * - getUserFullProfile: Fetches a full BharatConnect profile.
 */

export interface BharatConnectUser {
  id: string; // Firebase UID
  name: string;
  email: string;
  phone?: string;
  photoURL?: string | null;
  bio?: string;
  currentAuraId?: string | null;
  onboardingComplete: boolean;
  createdAt: FieldValue; // Use FieldValue for serverTimestamp
  updatedAt: FieldValue; // Use FieldValue for serverTimestamp
}

/**
 * Creates or updates a full BharatConnect user profile in the '/bharatConnectUsers/{uid}' collection.
 * @param uid The Firebase User ID.
 * @param profileData Data for the full BharatConnect profile.
 */
export async function createOrUpdateUserFullProfile(
  uid: string,
  profileData: Omit<BharatConnectUser, 'id' | 'createdAt' | 'updatedAt' | 'email'> & { email: string } // email is now explicitly part of input for clarity
): Promise<void> {
  console.log(`[SVC_PROF] createOrUpdateUserFullProfile invoked for UID: ${uid}`);
  console.log(`[SVC_PROF] Received profileData (essentials): name=${profileData.name}, email=${profileData.email}, onboardingComplete=${profileData.onboardingComplete}`);

  const authInstanceInAction = getClientAuth(app); // Re-get auth instance
  const currentUserInAction = authInstanceInAction.currentUser;
  // This console.log is CRUCIAL for debugging. Check server-side (App Hosting/Cloud Run) logs.
  console.log(`[SVC_PROF] Auth state in server action (re-fetched) - currentUserInAction?.uid: ${currentUserInAction?.uid}`);


  if (!uid) {
    console.error("[SVC_PROF] createOrUpdateUserFullProfile: UID is required.");
    throw new Error("User ID is required to create or update profile.");
  }
  if (!profileData.name) {
    console.error("[SVC_PROF] createOrUpdateUserFullProfile: Name is required.");
    throw new Error("Name is required for profile.");
  }
  if (!profileData.email) {
    console.error("[SVC_PROF] createOrUpdateUserFullProfile: Email is required.");
    throw new Error("Email is required for profile.");
  }

  try {
    const profileDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const existingProfileSnap = await getDoc(profileDocRef);

    // Ensure all fields potentially being undefined are handled gracefully.
    const dataToSet: Partial<Omit<BharatConnectUser, 'createdAt' | 'updatedAt'>> & { updatedAt: FieldValue, id: string, email: string, name: string, onboardingComplete: boolean } = {
      id: uid,
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone || undefined, // Use undefined if not provided
      photoURL: profileData.photoURL || null, // Use null if not provided
      bio: profileData.bio || undefined,
      currentAuraId: profileData.currentAuraId || null,
      onboardingComplete: profileData.onboardingComplete,
      updatedAt: serverTimestamp(),
    };

    if (!existingProfileSnap.exists()) {
      // Only add createdAt if the document is new
      (dataToSet as Partial<BharatConnectUser>).createdAt = serverTimestamp();
      console.log(`[SVC_PROF] Profile for UID: ${uid} does not exist. Will create with createdAt timestamp.`);
    } else {
      console.log(`[SVC_PROF] Profile for UID: ${uid} exists. Will merge/update.`);
    }
    
    console.log(`[SVC_PROF] Path for Firestore write: bharatConnectUsers/${uid}`);
    // Log safely, converting undefined to null for JSON.stringify if needed
    console.log(`[SVC_PROF] Data to be set/merged: ${JSON.stringify(dataToSet, (key, value) => (value === undefined ? null : value), 2)}`);

    await setDoc(profileDocRef, dataToSet, { merge: true });
    console.log(`[SVC_PROF] Full profile for UID: ${uid} successfully written/merged to '/bharatConnectUsers'.`);

  } catch (error: any) {
    console.error(`[SVC_PROF] Error writing full profile for UID ${uid}. Raw error:`, error);
    
    let firebaseErrorCode = null;
    // Check if the error object has a 'code' property (common in Firebase errors)
    if (error && typeof error.code === 'string') {
        firebaseErrorCode = error.code;
    }
    if (firebaseErrorCode) {
      console.error(`[SVC_PROF] Firebase error code: ${firebaseErrorCode}`);
    }

    const authInstanceOnError = getClientAuth(app); // Re-get auth instance
    const currentUserInActionOnError = authInstanceOnError.currentUser;
    console.error(`[SVC_PROF] Auth state during error (re-fetched) - currentUserInActionOnError?.uid: ${currentUserInActionOnError?.uid}`);
    
    let detailedErrorMessage = `Failed to save profile. Original error: ${error.message || 'An unknown server error occurred.'}`;
    if (firebaseErrorCode) {
        detailedErrorMessage += ` (Code: ${firebaseErrorCode})`;
    }
    throw new Error(detailedErrorMessage);
  }
}

/**
 * Fetches a full BharatConnect user profile from the '/bharatConnectUsers' collection.
 * @param uid The Firebase User ID.
 * @returns The BharatConnectUser object, or null if not found.
 */
export async function getUserFullProfile(uid: string): Promise<BharatConnectUser | null> {
  if (!uid) {
    console.warn("[SVC_PROF] getUserFullProfile: Called with no UID.");
    return null;
  }
  try {
    const profileDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const docSnap = await getDoc(profileDocRef);

    if (docSnap.exists()) {
      // Timestamps will be Firebase Timestamp objects, ensure client handles them or convert here if necessary
      return docSnap.data() as BharatConnectUser;
    } else {
      console.log(`[SVC_PROF] getUserFullProfile: No profile found in '/bharatConnectUsers' for UID: ${uid}.`);
      return null;
    }
  } catch (error: any) {
    console.error(`[SVC_PROF] getUserFullProfile: Error fetching full profile for UID ${uid}:`, error);
    if (error.code) console.error(`[SVC_PROF] Firebase error code: ${error.code}`);
    if (error.message) console.error(`[SVC_PROF] Firebase error message: ${error.message}`);
    return null; // Or rethrow, depending on desired error handling
  }
}
