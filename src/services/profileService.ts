
import { auth, firestore } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import type { User } from '@/types'; // Import the User type

// BharatConnectFirestoreUser no longer contains direct aura fields. Aura is in 'auras' collection.
export interface BharatConnectFirestoreUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  originalDisplayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  bio?: string | null;
  onboardingComplete: boolean;
  languagePreference?: string;
  status?: string;
  publicKey?: string; // For E2EE
  // currentAuraId and auraExpiresAt removed
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// UserProfileUpdateData no longer contains direct aura fields.
export type UserProfileUpdateData = {
  email: string;
  username: string;
  displayName: string;
  onboardingComplete: boolean;
  originalDisplayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  bio?: string | null;
  publicKey?: string;
  // currentAuraId and auraExpiresAt removed
};

export async function createOrUpdateUserFullProfile(
  uid: string,
  profileData: UserProfileUpdateData
): Promise<void> {
  console.log(`[SVC_PROF] createOrUpdateUserFullProfile called for UID: ${uid}. Data:`, JSON.stringify(profileData));
  if (!uid) throw new Error("UID is required to create or update user profile.");
  if (!profileData.username) throw new Error("Username is required.");
  if (!firestore) throw new Error("Firestore is not initialized.");

  const userDocRef = doc(firestore, 'bharatConnectUsers', uid);

  // Map profileData to Firestore structure, excluding undefined aura fields
  const firestoreData: Partial<Omit<BharatConnectFirestoreUser, 'id' | 'createdAt' | 'updatedAt'>> = {
    email: profileData.email.toLowerCase(),
    username: profileData.username.toLowerCase(),
    displayName: profileData.displayName, // Store with original casing in Firestore's displayName
    originalDisplayName: profileData.originalDisplayName === undefined ? (profileData.displayName || null) : profileData.originalDisplayName,
    onboardingComplete: profileData.onboardingComplete,
    ...(profileData.photoURL !== undefined && { photoURL: profileData.photoURL }),
    ...(profileData.phoneNumber !== undefined && { phoneNumber: profileData.phoneNumber }),
    ...(profileData.bio !== undefined && { bio: profileData.bio }),
    ...(profileData.publicKey !== undefined && { publicKey: profileData.publicKey }),
  };

  const finalFirestorePayload: any = {};
  for (const key in firestoreData) {
    if (firestoreData[key as keyof typeof firestoreData] !== undefined) {
      finalFirestorePayload[key] = firestoreData[key as keyof typeof firestoreData];
    }
  }

  if (Object.keys(finalFirestorePayload).length === 0) {
     const docSnap = await getDoc(userDocRef);
     if (docSnap.exists()) {
        await updateDoc(userDocRef, { updatedAt: serverTimestamp() }); return;
     } else { throw new Error("No valid data provided for profile creation."); }
  }

  const authProfileUpdate: { displayName?: string; photoURL?: string | null } = {};
  if (profileData.displayName) authProfileUpdate.displayName = profileData.displayName;
  if (profileData.photoURL !== undefined) authProfileUpdate.photoURL = profileData.photoURL;

  try {
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      await setDoc(userDocRef, { ...finalFirestorePayload, id: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } else {
      if (Object.keys(finalFirestorePayload).length > 0) {
         await updateDoc(userDocRef, { ...finalFirestorePayload, updatedAt: serverTimestamp() });
      }
    }

    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      const needsAuthUpdate = (authProfileUpdate.displayName && authProfileUpdate.displayName !== currentUser.displayName) || (authProfileUpdate.photoURL !== undefined && authProfileUpdate.photoURL !== currentUser.photoURL);
      if (needsAuthUpdate) await updateProfile(currentUser, authProfileUpdate);
    }
  } catch (error) { console.error(`[SVC_PROF] Error saving/updating profile for ${uid}:`, error); throw error; }
}

// getUserFullProfile now returns a Promise<User | null>.
// Aura data needs to be fetched separately from the 'auras' collection.
export async function getUserFullProfile(
  uid: string
): Promise<User | null> {
  console.warn(`[SVC_PROF] getUserFullProfile called for UID: ${uid}.`);
  if (!firestore) { console.error("[SVC_PROF] Firestore instance is not available!"); return null; }
  if (!uid) return null;

  try {
    const userDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as BharatConnectFirestoreUser; // Data from Firestore

      // Map to the client-side User type
      const clientUser: User = {
        id: uid, // Use the passed uid or docSnap.id
        name: data.originalDisplayName || data.displayName || 'User', // Map to 'name'
        email: data.email,
        username: data.username,
        avatarUrl: data.photoURL || undefined, // Map photoURL to avatarUrl
        phone: data.phoneNumber || undefined, // Map phoneNumber to phone
        bio: data.bio || undefined,
        onboardingComplete: data.onboardingComplete || false,
        status: data.status || undefined,
        publicKey: data.publicKey || undefined,
        // hasViewedStatus is a client-side property, not stored in Firestore profile directly for this general fetch.
        // It might be part of a specific context (like status updates list). For general profile, it's usually not included.
      };
      return clientUser;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`[SVC_PROF] Error fetching profile for ${uid}:`, error);
    return null;
  }
}
