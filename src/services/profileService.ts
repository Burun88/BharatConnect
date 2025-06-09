
'use server';

import { firestore } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @fileOverview Service functions for managing user profiles.
 * - BharatConnectProfile: Type definition for a BharatConnect user profile.
 * - getInstaBharatProfileData: Fetches minimal data from an existing InstaBharat profile.
 * - getBharatConnectProfile: Fetches a BharatConnect profile.
 * - createBharatConnectProfile: Creates a new BharatConnect profile.
 */

export interface BharatConnectProfile {
  id: string; // Firebase UID
  name: string;
  phone: string; // Phone number used for auth
  photoURL?: string; // URL of the profile picture used in BharatConnect
  currentAuraId?: string | null;
  createdAt: any; // Firestore ServerTimestamp
  updatedAt: any; // Firestore ServerTimestamp
}

interface InstaBharatRawProfile {
  fullName?: string;
  profilePicURL?: string;
  profilePictureUrls?: {
    main?: string;
    avatar?: string;
    icon?: string;
  };
  // Add other fields if needed, but keep it minimal for type safety
  [key: string]: any; // Allow other fields
}

/**
 * Fetches minimal profile data (name and photo URL) from an existing InstaBharat user profile.
 * Assumes InstaBharat profiles are in a collection named 'users'.
 * @param uid The Firebase User ID.
 * @returns An object with name and photoURL, or null if not found.
 */
export async function getInstaBharatProfileData(uid: string): Promise<{ name: string | null; photoURL: string | null } | null> {
  if (!uid) return null;
  try {
    const userDocRef = doc(firestore, 'users', uid); // Assuming 'users' is the collection name for InstaBharat
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as InstaBharatRawProfile;
      const name = data.fullName || null;
      let photoURL = null;

      if (data.profilePictureUrls?.main) {
        photoURL = data.profilePictureUrls.main;
      } else if (data.profilePicURL) {
        photoURL = data.profilePicURL;
      }
      
      return { name, photoURL };
    } else {
      console.log(`No InstaBharat profile found for UID: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching InstaBharat profile data:", error);
    return null;
  }
}

/**
 * Fetches a BharatConnect user profile from the 'bharatConnectProfiles' collection.
 * @param uid The Firebase User ID.
 * @returns The BharatConnectProfile object, or null if not found.
 */
export async function getBharatConnectProfile(uid: string): Promise<BharatConnectProfile | null> {
  if (!uid) return null;
  try {
    const profileDocRef = doc(firestore, 'bharatConnectProfiles', uid);
    const docSnap = await getDoc(profileDocRef);

    if (docSnap.exists()) {
      return docSnap.data() as BharatConnectProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching BharatConnect profile:", error);
    return null;
  }
}

/**
 * Creates or updates a BharatConnect user profile in the 'bharatConnectProfiles' collection.
 * @param uid The Firebase User ID.
 * @param profileData Partial data for the BharatConnect profile. Name and Phone are required for creation.
 */
export async function createOrUpdateBharatConnectProfile(
  uid: string,
  profileData: Partial<Omit<BharatConnectProfile, 'id' | 'createdAt' | 'updatedAt'>> & { name: string; phone: string }
): Promise<void> {
  if (!uid) throw new Error("UID is required to create or update a profile.");
  if (!profileData.name) throw new Error("Name is required for the profile.");
  if (!profileData.phone) throw new Error("Phone is required for the profile.");

  try {
    const profileDocRef = doc(firestore, 'bharatConnectProfiles', uid);
    const existingProfileSnap = await getDoc(profileDocRef);

    const dataToSet: Partial<BharatConnectProfile> = {
      ...profileData,
      updatedAt: serverTimestamp(),
    };

    if (!existingProfileSnap.exists()) {
      dataToSet.createdAt = serverTimestamp();
      dataToSet.id = uid; // Ensure id is set on creation
    }

    await setDoc(profileDocRef, dataToSet, { merge: true });
    console.log(`BharatConnect profile for UID: ${uid} successfully written/merged.`);
  } catch (error) {
    console.error("Error writing BharatConnect profile:", error);
    throw error; // Re-throw to allow caller to handle
  }
}
