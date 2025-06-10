
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
  // This log is CRITICAL for diagnosing Firestore permission issues.
  // If currentUserInAction is null or its UID doesn't match 'uid', Firestore rules will deny write access.
  console.log(`[SVC_PROF] Auth state in server action (re-fetched) - currentUserInAction?.uid: ${currentUserInAction?.uid}`);

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

  try {
    // Explicitly check if the server action is running with an authenticated context
    // and if that context matches the UID of the profile being modified.
    // This is what `request.auth.uid == userId` in Firestore rules checks.
    if (!currentUserInAction) {
      console.error(`[SVC_PROF] Server action is unauthenticated. Firestore write for UID ${uid} will be denied by security rules.`);
      throw new Error("Server action unauthenticated. Cannot save profile. This often indicates an issue with the App Hosting environment or its service account permissions.");
    }
    if (currentUserInAction.uid !== uid) {
      console.error(`[SVC_PROF] Authenticated user in server action (${currentUserInAction.uid}) does not match target profile UID (${uid}). Firestore write will be denied.`);
      throw new Error("Authenticated user mismatch. Cannot save profile for another user. This is a security restriction.");
    }

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
    // Check if the error message already indicates an auth issue from our explicit checks
    if (error.message.startsWith("Server action unauthenticated") || error.message.startsWith("Authenticated user mismatch")) {
      console.error(`[SVC_PROF] Pre-Firestore check failed: ${error.message}`);
      throw error; // Re-throw the more specific error
    }

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
    // Log the auth state again on error, just in case it's relevant
    const authInstanceOnError = getClientAuth(app);
    const currentUserInActionOnError = authInstanceOnError.currentUser;
    console.error(`[SVC_PROF] Auth state during error (re-fetched) - currentUserInActionOnError?.uid: ${currentUserInActionOnError?.uid}`);
    
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
      // Convert Firestore Timestamps to a serializable format if necessary,
      // though for server actions returning to client components, Next.js handles this.
      // For direct use within server components, it's fine.
      const data = docSnap.data() as BharatConnectFirestoreUser;
      // Example of manual conversion if needed elsewhere:
      // if (data.lastSeen && typeof data.lastSeen.toDate === 'function') {
      //   data.lastSeen = data.lastSeen.toDate().toISOString();
      // }
      // if (data.createdAt && typeof data.createdAt.toDate === 'function') {
      //   data.createdAt = data.createdAt.toDate().toISOString();
      // }
      // if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
      //   data.updatedAt = data.updatedAt.toDate().toISOString();
      // }
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

    