
'use server';

import { auth, firestore } from '@/lib/firebase'; // Ensure auth is imported
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @fileOverview Service functions for managing BharatConnect user profiles.
 * - BharatConnectUser: Full user profile for BharatConnect.
 * - createOrUpdateUserFullProfile: Manages the full profile in '/bharatConnectUsers'.
 * - getUserFullProfile: Fetches a full BharatConnect profile.
 */

export interface BharatConnectUser {
  id: string; // Firebase UID
  name: string; // Name chosen/set in BharatConnect
  email: string;
  phone?: string;
  photoURL?: string | null; // Profile picture URL used in BharatConnect
  bio?: string;
  currentAuraId?: string | null;
  onboardingComplete: boolean;
  createdAt: any; // Firestore ServerTimestamp
  updatedAt: any; // Firestore ServerTimestamp
}

/**
 * Creates or updates a full BharatConnect user profile in the '/bharatConnectUsers/{uid}' collection.
 * @param uid The Firebase User ID.
 * @param profileData Data for the full BharatConnect profile.
 */
export async function createOrUpdateUserFullProfile(
  uid: string,
  profileData: Omit<BharatConnectUser, 'id' | 'createdAt' | 'updatedAt'> // Email is part of this
): Promise<void> {
  console.log(`[SVC_PROF] createOrUpdateUserFullProfile invoked for UID: ${uid}`);
  console.log(`[SVC_PROF] Received profileData: ${JSON.stringify(profileData, null, 2)}`);

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

    const dataToSet: Partial<BharatConnectUser> = {
      id: uid,
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone || undefined,
      photoURL: profileData.photoURL || undefined,
      bio: profileData.bio || undefined,
      currentAuraId: profileData.currentAuraId || null,
      onboardingComplete: true, // Should always be true by this point in the flow
      updatedAt: serverTimestamp(),
    };

    if (!existingProfileSnap.exists()) {
      dataToSet.createdAt = serverTimestamp();
      console.log(`[SVC_PROF] Profile for UID: ${uid} does not exist. Will create with createdAt timestamp.`);
    } else {
      console.log(`[SVC_PROF] Profile for UID: ${uid} exists. Will merge/update.`);
    }
    
    // Log auth state as seen by the server action
    const currentUserInAction = auth.currentUser; // Get current user from imported auth instance
    console.log(`[SVC_PROF] Auth state in server action - currentUserInAction?.uid: ${currentUserInAction?.uid}`);
    console.log(`[SVC_PROF] Path for Firestore write: bharatConnectUsers/${uid}`);
    console.log(`[SVC_PROF] Data to be set/merged: ${JSON.stringify(dataToSet, null, 2)}`);

    await setDoc(profileDocRef, dataToSet, { merge: true });
    console.log(`[SVC_PROF] Full profile for UID: ${uid} successfully written/merged to '/bharatConnectUsers'.`);

  } catch (error: any) {
    console.error(`[SVC_PROF] Error writing full profile for UID ${uid}. Raw error:`, error);
    // It's helpful to log the structured error if possible
    if (error.code) console.error(`[SVC_PROF] Firebase error code: ${error.code}`);
    if (error.message) console.error(`[SVC_PROF] Firebase error message: ${error.message}`);
    
    // Log the auth state again in case of error to see if it changed or was different
    const currentUserInActionOnError = auth.currentUser;
    console.error(`[SVC_PROF] Auth state during error - currentUserInActionOnError?.uid: ${currentUserInActionOnError?.uid}`);
    
    throw new Error(`Failed to save profile: ${error.message || 'An unknown server error occurred.'}`);
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
      // console.log(`[SVC_PROF] getUserFullProfile: Profile found for UID: ${uid}.`);
      return docSnap.data() as BharatConnectUser;
    } else {
      console.log(`[SVC_PROF] getUserFullProfile: No profile found in '/bharatConnectUsers' for UID: ${uid}.`);
      return null;
    }
  } catch (error: any) {
    console.error(`[SVC_PROF] getUserFullProfile: Error fetching full profile for UID ${uid}:`, error);
    if (error.code) console.error(`[SVC_PROF] Firebase error code: ${error.code}`);
    if (error.message) console.error(`[SVC_PROF] Firebase error message: ${error.message}`);
    return null; // Or rethrow if you want the caller to handle it more explicitly
  }
}
