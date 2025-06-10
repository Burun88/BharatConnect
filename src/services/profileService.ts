
'use server';

import { app, firestore } from '@/lib/firebase';
import { getAuth as getClientAuth } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, FieldValue } from 'firebase/firestore';

/**
 * @fileOverview Service functions for managing BharatConnect user profiles in Firestore.
 * - BharatConnectFirestoreUser: Defines the structure of a user document in Firestore.
 * - createOrUpdateUserFullProfile: Creates or updates a user's profile document.
 * - getUserFullProfile: Fetches a user's profile document.
 */

export interface BharatConnectFirestoreUser {
  id: string; // Firebase UID, same as document ID
  email: string; // Mandatory
  displayName: string; // Mandatory
  photoURL?: string | null; // Optional
  phoneNumber?: string | null; // Optional
  
  status?: string; // Optional, e.g., "Hey! I'm using Bharat Connect."
  languagePreference?: string; // Optional, e.g., "hi"
  lastSeen?: FieldValue; // Timestamp of last activity, server-set

  bio?: string | null; // Optional, from original profile setup
  currentAuraId?: string | null; // Optional, from original profile setup
  
  onboardingComplete: boolean; // Crucial flag for new user flow
  
  createdAt: FieldValue; // Server-set timestamp
  updatedAt: FieldValue; // Server-set timestamp
}

/**
 * Creates or updates a user's profile document in the '/bharatConnectUsers/{uid}' collection.
 * This function is typically called at the end of the onboarding process.
 * @param uid The Firebase User ID of the profile to create/update.
 * @param profileData Data for the user's profile. `onboardingComplete` should be set by the caller.
 */
export async function createOrUpdateUserFullProfile(
  uid: string, // This is the UID of the user whose profile is being created/updated
  profileData: {
    email: string;
    displayName: string;
    onboardingComplete: boolean;
    photoURL?: string | null;
    phoneNumber?: string | null;
    bio?: string | null;
    status?: string;
    languagePreference?: string;
    currentAuraId?: string | null;
  }
): Promise<void> {
  console.log(`[SVC_PROF] createOrUpdateUserFullProfile invoked for target UID: ${uid}`);
  console.log(`[SVC_PROF] Received profileData: email=${profileData.email}, displayName=${profileData.displayName}, onboardingComplete=${profileData.onboardingComplete}`);

  const authInstanceInAction = getClientAuth(app);
  const currentUserInAction = authInstanceInAction.currentUser;
  // Log the auth state from the client SDK's perspective within the server action for diagnosis.
  // This does NOT necessarily reflect what Firestore rules will see in request.auth.
  console.log(`[SVC_PROF] Client SDK auth state in server action: currentUserInAction?.uid: ${currentUserInAction?.uid}`);


  if (!uid) {
    console.error("[SVC_PROF] createOrUpdateUserFullProfile: Target UID parameter is required.");
    throw new Error("User ID (target UID) is required to create or update profile.");
  }
  if (!profileData.displayName || profileData.displayName.trim() === '') {
    console.error("[SVC_PROF] createOrUpdateUserFullProfile: Display Name is required.");
    throw new Error("Display Name is required for profile.");
  }
  if (!profileData.email || profileData.email.trim() === '') {
    console.error("[SVC_PROF] createOrUpdateUserFullProfile: Email is required.");
    throw new Error("Email is required for profile.");
  }

  // The early throws based on currentUserInAction have been removed.
  // Firestore rules will now be the primary gatekeeper based on the actual request.auth context
  // provided by the App Hosting environment.

  try {
    const profileDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const existingProfileSnap = await getDoc(profileDocRef);

    const dataToSet: Partial<BharatConnectFirestoreUser> = {
      id: uid, // Ensure the 'id' field in the document matches the UID
      email: profileData.email,
      displayName: profileData.displayName,
      photoURL: profileData.photoURL !== undefined ? profileData.photoURL : null,
      phoneNumber: profileData.phoneNumber !== undefined ? profileData.phoneNumber : null,
      bio: profileData.bio !== undefined ? profileData.bio : null,
      currentAuraId: profileData.currentAuraId !== undefined ? profileData.currentAuraId : null,
      status: profileData.status || `Hey! I'm using Bharat Connect.`,
      languagePreference: profileData.languagePreference || 'en',
      onboardingComplete: profileData.onboardingComplete,
      updatedAt: serverTimestamp(),
    };

    if (!existingProfileSnap.exists()) {
      dataToSet.createdAt = serverTimestamp();
      dataToSet.lastSeen = serverTimestamp();
      console.log(`[SVC_PROF] Profile for UID: ${uid} does not exist. Will create with createdAt and lastSeen timestamp.`);
    } else {
      console.log(`[SVC_PROF] Profile for UID: ${uid} exists. Will merge/update.`);
    }
    
    console.log(`[SVC_PROF] Path for Firestore write: bharatConnectUsers/${uid}`);
    console.log(`[SVC_PROF] Data to be set/merged: ${JSON.stringify(dataToSet, (key, value) => (value === undefined ? null : value), 2)}`);

    await setDoc(profileDocRef, dataToSet, { merge: true });
    console.log(`[SVC_PROF] Full profile for UID: ${uid} successfully written/merged to '/bharatConnectUsers'.`);

  } catch (error: any) {
    console.error(`[SVC_PROF] Error writing full profile for UID ${uid}. Raw error:`, error);
    
    let firebaseErrorCode = null;
    if (error && typeof error.code === 'string') {
        firebaseErrorCode = error.code;
    }
    if (firebaseErrorCode) {
      console.error(`[SVC_PROF] Firebase error code: ${firebaseErrorCode}`);
    }
    
    let detailedErrorMessage = `Failed to save profile. Original error: ${error.message || 'An unknown server error occurred.'}`;
    if (firebaseErrorCode) {
        detailedErrorMessage += ` (Code: ${firebaseErrorCode})`;
    }
    
    // Log the client SDK auth state again on error, for comparison.
    const authInstanceOnError = getClientAuth(app);
    const currentUserInActionOnError = authInstanceOnError.currentUser;
    console.error(`[SVC_PROF] Client SDK auth state during error: currentUserInActionOnError?.uid: ${currentUserInActionOnError?.uid}`);
    
    throw new Error(detailedErrorMessage);
  }
}

/**
 * Fetches a full user profile from the '/bharatConnectUsers' collection.
 * @param uid The Firebase User ID.
 * @returns The BharatConnectFirestoreUser object, or null if not found.
 */
export async function getUserFullProfile(uid: string): Promise<BharatConnectFirestoreUser | null> {
  if (!uid) {
    console.warn("[SVC_PROF] getUserFullProfile: Called with no UID.");
    return null;
  }
  try {
    const profileDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const docSnap = await getDoc(profileDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as BharatConnectFirestoreUser;
      return data;
    } else {
      console.log(`[SVC_PROF] getUserFullProfile: No profile found in '/bharatConnectUsers' for UID: ${uid}.`);
      return null;
    }
  } catch (error: any) {
    console.error(`[SVC_PROF] getUserFullProfile: Error fetching full profile for UID ${uid}:`, error);
    if (error.code) console.error(`[SVC_PROF] Firebase error code: ${error.code}`);
    if (error.message) console.error(`[SVC_PROF] Firebase error message: ${error.message}`);
    return null;
  }
}
