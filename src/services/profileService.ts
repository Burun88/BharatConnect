
'use server';

import { firestore } from '@/lib/firebase';
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
  profileData: Omit<BharatConnectUser, 'id' | 'createdAt' | 'updatedAt' | 'email'> & { email: string }
): Promise<void> {
  if (!uid) throw new Error("[profileService] createOrUpdateUserFullProfile: UID is required.");
  if (!profileData.name) throw new Error("[profileService] createOrUpdateUserFullProfile: Name is required.");
  if (!profileData.email) throw new Error("[profileService] createOrUpdateUserFullProfile: Email is required.");

  try {
    const profileDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const existingProfileSnap = await getDoc(profileDocRef);

    const dataToSet: Partial<BharatConnectUser> = {
      id: uid, // Ensure ID is explicitly set
      email: profileData.email,
      name: profileData.name,
      phone: profileData.phone || undefined,
      photoURL: profileData.photoURL || undefined,
      bio: profileData.bio || undefined,
      currentAuraId: profileData.currentAuraId || null,
      onboardingComplete: true, // Will always be true when this function is called successfully
      updatedAt: serverTimestamp(),
    };

    if (!existingProfileSnap.exists()) {
      dataToSet.createdAt = serverTimestamp();
    }
    
    console.log('[profileService] createOrUpdateUserFullProfile: Attempting to set/merge document in /bharatConnectUsers with data for UID:', uid, JSON.stringify(dataToSet, null, 2));
    await setDoc(profileDocRef, dataToSet, { merge: true });
    console.log(`[profileService] createOrUpdateUserFullProfile: Full profile for UID: ${uid} successfully written/merged to '/bharatConnectUsers'.`);

  } catch (error) {
    console.error(`[profileService] createOrUpdateUserFullProfile: Error writing full profile for UID ${uid}:`, error);
    throw error; // Re-throw the error so the calling page can handle it
  }
}

/**
 * Fetches a full BharatConnect user profile from the '/bharatConnectUsers' collection.
 * @param uid The Firebase User ID.
 * @returns The BharatConnectUser object, or null if not found.
 */
export async function getUserFullProfile(uid: string): Promise<BharatConnectUser | null> {
  if (!uid) return null;
  try {
    const profileDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const docSnap = await getDoc(profileDocRef);

    if (docSnap.exists()) {
      return docSnap.data() as BharatConnectUser;
    } else {
      console.log(`[profileService] getUserFullProfile: No profile found in '/bharatConnectUsers' for UID: ${uid}.`);
      return null;
    }
  } catch (error) {
    console.error(`[profileService] getUserFullProfile: Error fetching full profile for UID ${uid}:`, error);
    return null;
  }
}
