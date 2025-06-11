
// Firebase services have been removed from this project.
// This file is kept as a placeholder.
// You will need to re-implement profile service logic
// if you re-integrate Firebase or another backend.

import { auth, firestore } from '@/lib/firebase'; // Ensure auth is imported
import { doc, setDoc, serverTimestamp, getDoc, updateDoc, type Timestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth'; // Import updateProfile

export interface BharatConnectFirestoreUser {
  id: string; // Document ID (user's auth UID) is also stored as a field named 'id'
  email: string; // Stored in lowercase for searching
  displayName: string; // Stored in lowercase for searching
  originalDisplayName?: string | null; // Optional: Store original casing for display
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
    email: string; // Original casing email
    displayName: string; // Original casing displayName
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

  // Data for Firestore: store searchable fields in lowercase
  const firestoreData: Omit<BharatConnectFirestoreUser, 'createdAt' | 'updatedAt' | 'id'> & { id: string } = {
    id: uid,
    email: profileData.email.toLowerCase(), // Store email in lowercase
    displayName: profileData.displayName.toLowerCase(), // Store displayName in lowercase
    originalDisplayName: profileData.displayName, // Keep original for display
    photoURL: profileData.photoURL !== undefined ? profileData.photoURL : null,
    phoneNumber: profileData.phoneNumber !== undefined ? profileData.phoneNumber : null,
    bio: profileData.bio !== undefined ? profileData.bio : null,
    onboardingComplete: profileData.onboardingComplete,
  };

  // Data for Firebase Auth update (use original casing for displayName)
  const authProfileUpdate: { displayName?: string; photoURL?: string | null } = {};
  if (profileData.displayName) {
    authProfileUpdate.displayName = profileData.displayName; // Use original casing for Auth profile
  }
  if (profileData.photoURL !== undefined) {
    authProfileUpdate.photoURL = profileData.photoURL;
  }


  try {
    // 1. Update Firestore document
    const docSnap = await getDoc(userDocRef);
    const dataForFirestoreOperation = { ...firestoreData };

    if (!docSnap.exists()) {
      await setDoc(userDocRef, {
        ...dataForFirestoreOperation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`[SVC_PROF] User profile for ${uid} CREATED in Firestore collection 'bharatConnectUsers'. Email: ${firestoreData.email}, DisplayName: ${firestoreData.displayName}`);
    } else {
      await updateDoc(userDocRef, {
        ...dataForFirestoreOperation,
        updatedAt: serverTimestamp(),
      });
      console.log(`[SVC_PROF] User profile for ${uid} UPDATED in Firestore collection 'bharatConnectUsers'. Email: ${firestoreData.email}, DisplayName: ${firestoreData.displayName}`);
    }

    // 2. Update Firebase Auth user profile
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
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
      const data = docSnap.data() as BharatConnectFirestoreUser;
      // Ensure originalDisplayName is used for display if available, otherwise fallback to displayName (which is lowercase)
      return { ...data, displayName: data.originalDisplayName || data.displayName };
    } else {
      console.log(`[SVC_PROF] No profile found for ${uid} in 'bharatConnectUsers'.`);
      return null;
    }
  } catch (error) {
    console.error(`[SVC_PROF] Error fetching profile for ${uid} from 'bharatConnectUsers':`, error);
    return null;
  }
}
