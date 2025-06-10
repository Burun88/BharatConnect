
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

  bio?: string; // Optional, from original profile setup
  currentAuraId?: string | null; // Optional, from original profile setup
  
  onboardingComplete: boolean; // Crucial flag for new user flow
  
  createdAt: FieldValue; // Server-set timestamp
  updatedAt: FieldValue; // Server-set timestamp
}

/**
 * Creates or updates a user's profile document in the '/bharatConnectUsers/{uid}' collection.
 * This function is typically called at the end of the onboarding process.
 * @param uid The Firebase User ID.
 * @param profileData Data for the user's profile. `onboardingComplete` should be set by the caller.
 */
export async function createOrUpdateUserFullProfile(
  uid: string,
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
  console.log(`[SVC_PROF] createOrUpdateUserFullProfile invoked for UID: ${uid}`);
  console.log(`[SVC_PROF] Received profileData: email=${profileData.email}, displayName=${profileData.displayName}, onboardingComplete=${profileData.onboardingComplete}`);

  const authInstanceInAction = getClientAuth(app);
  const currentUserInAction = authInstanceInAction.currentUser;
  console.log(`[SVC_PROF] Auth state in server action (re-fetched) - currentUserInAction?.uid: ${currentUserInAction?.uid}`);

  if (!uid) {
    console.error("[SVC_PROF] createOrUpdateUserFullProfile: UID is required.");
    throw new Error("User ID is required to create or update profile.");
  }
  if (!profileData.displayName || profileData.displayName.trim() === '') {
    console.error("[SVC_PROF] createOrUpdateUserFullProfile: Display Name is required.");
    throw new Error("Display Name is required for profile.");
  }
  if (!profileData.email || profileData.email.trim() === '') {
    console.error("[SVC_PROF] createOrUpdateUserFullProfile: Email is required.");
    throw new Error("Email is required for profile.");
  }

  try {
    const profileDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const existingProfileSnap = await getDoc(profileDocRef);

    const dataToSet: Partial<BharatConnectFirestoreUser> = {
      id: uid,
      email: profileData.email,
      displayName: profileData.displayName,
      photoURL: profileData.photoURL || null,
      phoneNumber: profileData.phoneNumber || null,
      bio: profileData.bio || undefined, // Keep if used
      currentAuraId: profileData.currentAuraId || null, // Keep if used
      status: profileData.status || `Hey! I'm using Bharat Connect.`, // Default status
      languagePreference: profileData.languagePreference || 'en', // Default language
      onboardingComplete: profileData.onboardingComplete,
      updatedAt: serverTimestamp(),
    };

    if (!existingProfileSnap.exists()) {
      dataToSet.createdAt = serverTimestamp();
      dataToSet.lastSeen = serverTimestamp(); // Set initial lastSeen on creation
      console.log(`[SVC_PROF] Profile for UID: ${uid} does not exist. Will create with createdAt and lastSeen timestamp.`);
    } else {
      console.log(`[SVC_PROF] Profile for UID: ${uid} exists. Will merge/update.`);
      // lastSeen could be updated here too, or separately on user activity
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

    const authInstanceOnError = getClientAuth(app);
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
      return docSnap.data() as BharatConnectFirestoreUser;
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
