
'use server';

import { firestore } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @fileOverview Service functions for managing user profiles.
 * - BharatConnectProfile: Type definition for a BharatConnect user profile.
 * - getInstaBharatProfileData: Fetches minimal data from an existing InstaBharat profile.
 * - getBharatConnectProfile: Fetches a BharatConnect profile.
 * - createOrUpdateBharatConnectProfile: Creates or updates a new BharatConnect profile.
 */

export interface BharatConnectProfile {
  id: string; // Firebase UID
  name: string;
  email: string; // Email used for auth/profile
  phone?: string; // Optional phone number
  photoURL?: string; // URL of the profile picture used in BharatConnect
  currentAuraId?: string | null;
  onboardingComplete?: boolean; // To track if user has completed profile setup
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
  // Allow other fields from the provided structure
  [key: string]: any;
}

/**
 * Fetches minimal profile data (name and photo URL) from an existing InstaBharat user profile.
 * Assumes InstaBharat profiles are in a collection named 'users'.
 * @param uid The Firebase User ID.
 * @returns An object with name and photoURL, or null if not found or error.
 */
export async function getInstaBharatProfileData(uid: string): Promise<{ name: string | null; photoURL: string | null } | null> {
  if (!uid) return null;
  try {
    // IMPORTANT: If your InstaBharat profiles are NOT in a collection named 'users',
    // you MUST change 'users' below to your actual collection name.
    const userDocRef = doc(firestore, 'users', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as InstaBharatRawProfile;
      console.log(`Fetched InstaBharat raw data for UID ${uid}:`, JSON.stringify(data, null, 2)); // Added log
      const name = data.fullName || null;
      let photoURL = null;

      if (data.profilePictureUrls?.main) {
        photoURL = data.profilePictureUrls.main;
      } else if (data.profilePicURL) {
        // Fallback to top-level profilePicURL if map isn't present or main is missing
        photoURL = data.profilePicURL;
      }
      
      console.log(`Extracted for prefill - Name: ${name}, PhotoURL: ${photoURL}`);
      return { name, photoURL };
    } else {
      console.log(`No InstaBharat profile found for UID: ${uid} in 'users' collection. Proceeding without prefill.`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching InstaBharat profile data:", error);
    return null; // Return null on error to handle gracefully
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
 * Requires 'name' and 'email' for the profile.
 * @param uid The Firebase User ID.
 * @param profileData Partial data for the BharatConnect profile. Name and Email are essential.
 */
export async function createOrUpdateBharatConnectProfile(
  uid: string,
  profileData: Partial<Omit<BharatConnectProfile, 'id' | 'createdAt' | 'updatedAt'>> & { name: string; email: string; }
): Promise<void> {
  if (!uid) throw new Error("UID is required to create or update a profile.");
  if (!profileData.name) throw new Error("Name is required for the profile.");
  if (!profileData.email) throw new Error("Email is required for the profile.");

  try {
    const profileDocRef = doc(firestore, 'bharatConnectProfiles', uid);
    const existingProfileSnap = await getDoc(profileDocRef);

    const dataToSet: Partial<BharatConnectProfile> = {
      ...profileData,
      id: uid, // Ensure id is always set
      updatedAt: serverTimestamp(),
    };

    if (!existingProfileSnap.exists()) {
      dataToSet.createdAt = serverTimestamp();
      dataToSet.onboardingComplete = profileData.onboardingComplete || false; // Default to false if not provided
    } else {
      // Ensure onboardingComplete is explicitly carried over or set
      dataToSet.onboardingComplete = profileData.onboardingComplete !== undefined 
        ? profileData.onboardingComplete 
        : existingProfileSnap.data()?.onboardingComplete || false;
    }
    
    console.log('Attempting to set BharatConnect Firestore document with data:', JSON.stringify(dataToSet, null, 2));

    await setDoc(profileDocRef, dataToSet, { merge: true });
    console.log(`BharatConnect profile for UID: ${uid} successfully written/merged.`);
  } catch (error)_
    console.error("Error writing BharatConnect profile:", error);
    throw error; // Re-throw to allow caller to handle
  }
}
