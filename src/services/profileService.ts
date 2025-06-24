
import { auth, firestore } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import type { User } from '@/types'; // Import the User type

// publicKey has been removed, as it's now managed in the userKeyVault
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
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// publicKey has been removed
export type UserProfileUpdateData = {
  email: string;
  username: string;
  displayName: string;
  onboardingComplete: boolean;
  originalDisplayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  bio?: string | null;
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

  const firestoreData: Partial<Omit<BharatConnectFirestoreUser, 'id' | 'createdAt' | 'updatedAt'>> = {
    email: profileData.email.toLowerCase(),
    username: profileData.username.toLowerCase(),
    displayName: profileData.displayName, // Store with original casing in Firestore's displayName
    originalDisplayName: profileData.originalDisplayName === undefined ? (profileData.displayName || null) : profileData.originalDisplayName,
    onboardingComplete: profileData.onboardingComplete,
    ...(profileData.photoURL !== undefined && { photoURL: profileData.photoURL }),
    ...(profileData.phoneNumber !== undefined && { phoneNumber: profileData.phoneNumber }),
    ...(profileData.bio !== undefined && { bio: profileData.bio }),
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

export async function getUserFullProfile(
  uid: string
): Promise<User | null> {
  if (!firestore) { console.error("[SVC_PROF] Firestore instance is not available!"); return null; }
  if (!uid) return null;

  try {
    const userDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const userVaultRef = doc(firestore, 'userKeyVaults', uid);
    
    const [userDocSnap, userVaultSnap] = await Promise.all([getDoc(userDocRef), getDoc(userVaultRef)]);
    
    if (userDocSnap.exists()) {
      const data = userDocSnap.data() as Omit<BharatConnectFirestoreUser, 'publicKey'>;
      const vaultData = userVaultSnap.exists() ? userVaultSnap.data() : null;

      const clientUser: User = {
        id: uid,
        name: data.originalDisplayName || data.displayName || 'User',
        email: data.email,
        username: data.username,
        avatarUrl: data.photoURL || undefined,
        phone: data.phoneNumber || undefined,
        bio: data.bio || undefined,
        onboardingComplete: data.onboardingComplete || false,
        status: data.status || undefined,
        activeKeyId: vaultData?.activeKeyId || undefined,
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
