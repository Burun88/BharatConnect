
'use server';

import { firestore } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

/**
 * @fileOverview Service functions for managing user profiles.
 * - InstaBharatIdentity: Minimal identity data from InstaBharat.
 * - BharatConnectUserShadow: Lightweight shadow profile for BharatConnect.
 * - BharatConnectUser: Full user profile for BharatConnect.
 * - getInstaBharatIdentity: Fetches identity from InstaBharat's '/users' collection.
 * - createOrUpdateShadowProfile: Manages the shadow profile in '/bharatConnectUserShadows'.
 * - getShadowProfile: Fetches a shadow profile.
 * - createOrUpdateUserFullProfile: Manages the full profile in '/bharatConnectUsers'.
 * - getUserFullProfile: Fetches a full BharatConnect profile.
 */

export interface InstaBharatIdentity {
  uid: string;
  name: string | null;
  profileImageUrl: string | null;
  username: string | null;
}

export interface BharatConnectUserShadow {
  uid: string;
  name: string | null;
  profileImageUrl: string | null;
  username: string | null;
  updatedAt: any; // Firestore ServerTimestamp
}

export interface BharatConnectUser {
  id: string; // Firebase UID
  name: string; // Name chosen/set in BharatConnect
  email: string;
  username?: string | null; // Copied from InstaBharat, not editable in BC
  phone?: string;
  photoURL?: string | null; // Profile picture URL used in BharatConnect
  bio?: string;
  currentAuraId?: string | null;
  onboardingComplete: boolean;
  createdAt: any; // Firestore ServerTimestamp
  updatedAt: any; // Firestore ServerTimestamp
}

interface InstaBharatRawProfile {
  fullName?: string;
  name?: string; // Fallback if fullName doesn't exist
  username?: string;
  profilePicURL?: string;
  profilePictureUrls?: {
    main?: string;
    avatar?: string;
    icon?: string;
  };
  [key: string]: any;
}

/**
 * Fetches minimal identity data (name, photo URL, username) from an existing InstaBharat user profile.
 * Assumes InstaBharat profiles are in a collection named 'users'.
 * @param uid The Firebase User ID.
 * @returns An InstaBharatIdentity object, or null if not found or error.
 */
export async function getInstaBharatIdentity(uid: string): Promise<InstaBharatIdentity | null> {
  if (!uid) {
    console.error("[profileService] getInstaBharatIdentity: UID is missing.");
    return null;
  }
  // If bharatconnect-i8510 does not have a /users collection, this will return null, which is fine.
  // The profile-setup page will then skip the import prompt.
  console.log(`[profileService] getInstaBharatIdentity: Attempting to fetch profile data for UID: ${uid} from '/users' collection (simulated InstaBharat structure).`);
  try {
    const userDocRef = doc(firestore, 'users', uid); 
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as InstaBharatRawProfile;
      console.log(`[profileService] getInstaBharatIdentity: Raw data from '/users/${uid}':`, JSON.stringify(data, null, 2).substring(0, 500) + "...");

      let name: string | null = null;
      if (data.fullName) name = data.fullName;
      else if (data.name) name = data.name;
      
      let username: string | null = null;
      if (data.username) username = data.username;
      
      let profileImageUrl: string | null = null;
      if (data.profilePicURL) profileImageUrl = data.profilePicURL;
      else if (data.profilePictureUrls?.main) profileImageUrl = data.profilePictureUrls.main;
      else if (data.profilePictureUrls?.avatar) profileImageUrl = data.profilePictureUrls.avatar;

      const identity: InstaBharatIdentity = { uid, name, profileImageUrl, username };
      console.log(`[profileService] getInstaBharatIdentity: Extracted for UID ${uid} - Name: '${identity.name}', ProfileImageURL: '${identity.profileImageUrl}', Username: '${identity.username}'`);
      return identity;

    } else {
      console.log(`[profileService] getInstaBharatIdentity: No profile found in '/users' collection for UID: ${uid}. This is expected if bharatconnect-i8510 doesn't use this structure.`);
      return null;
    }
  } catch (error: any) {
    console.error(`[profileService] getInstaBharatIdentity: Error fetching from '/users/${uid}'. Firestore permissions might be an issue or collection doesn't exist.`, error.message, error.code);
    return null;
  }
}

/**
 * Creates or updates a BharatConnect shadow profile in '/bharatConnectUserShadows/{uid}'.
 * @param identity The InstaBharatIdentity data.
 */
export async function createOrUpdateShadowProfile(identity: InstaBharatIdentity): Promise<BharatConnectUserShadow | null> {
  if (!identity || !identity.uid) {
    console.error("[profileService] createOrUpdateShadowProfile: UID is missing from identity data.");
    return null;
  }
  try {
    const shadowDocRef = doc(firestore, 'bharatConnectUserShadows', identity.uid);
    const shadowData: BharatConnectUserShadow = {
      uid: identity.uid,
      name: identity.name || null,
      profileImageUrl: identity.profileImageUrl || null,
      username: identity.username || null,
      updatedAt: serverTimestamp(),
    };
    await setDoc(shadowDocRef, shadowData, { merge: true });
    console.log(`[profileService] createOrUpdateShadowProfile: Shadow profile for UID ${identity.uid} written/merged successfully to '/bharatConnectUserShadows'. Data:`, shadowData);
    return shadowData;
  } catch (error) {
    console.error(`[profileService] createOrUpdateShadowProfile: Error writing shadow profile for UID ${identity.uid}:`, error);
    return null;
  }
}

/**
 * Fetches a BharatConnect shadow profile.
 * @param uid The Firebase User ID.
 * @returns The BharatConnectUserShadow object, or null.
 */
export async function getShadowProfile(uid: string): Promise<BharatConnectUserShadow | null> {
  if (!uid) return null;
  try {
    const shadowDocRef = doc(firestore, 'bharatConnectUserShadows', uid);
    const docSnap = await getDoc(shadowDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as BharatConnectUserShadow;
    }
    return null;
  } catch (error) {
    console.error(`[profileService] getShadowProfile: Error fetching shadow profile for UID ${uid}:`, error);
    return null;
  }
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
      username: profileData.username || undefined, // Will be undefined if not imported
      currentAuraId: profileData.currentAuraId || null,
      onboardingComplete: true,
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
