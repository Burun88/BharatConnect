
"use client";

import { useEffect } from 'react';
import { auth, onAuthUserChanged, type FirebaseUser } from '@/lib/firebase';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { User } from '@/types'; // Use the main User type
import { getUserFullProfile } from '@/services/profileService';
import { generateAndStoreKeyPair } from '@/services/encryptionService';


export default function FirebaseAuthObserver() {
  const [userInLs, setUserInLs] = useLocalStorage<User | null>('bharatconnect-user', null);

  useEffect(() => {
    const unsubscribe = onAuthUserChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        console.log("[AuthObserver] Firebase user detected:", firebaseUser.uid, firebaseUser.email);
        const previousUserInLs = userInLs;
        try {
          const firestoreProfile = await getUserFullProfile(firebaseUser.uid);
          let userToStore: User;

          if (firestoreProfile) {
            // Check for E2EE keys and generate if missing
            if (!firestoreProfile.publicKey) {
              await generateAndStoreKeyPair(firebaseUser.uid);
              // Re-fetch profile to get the new public key
              const updatedProfile = await getUserFullProfile(firebaseUser.uid);
              if (updatedProfile) Object.assign(firestoreProfile, updatedProfile);
            }

            userToStore = {
              id: firebaseUser.uid,
              email: firestoreProfile.email || firebaseUser.email || '',
              name: firestoreProfile.originalDisplayName || firestoreProfile.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              avatarUrl: firestoreProfile.photoURL || firebaseUser.photoURL || undefined,
              phone: firestoreProfile.phoneNumber || undefined,
              username: firestoreProfile.username || undefined,
              bio: firestoreProfile.bio || undefined,
              status: firestoreProfile.status || previousUserInLs?.status || undefined,
              onboardingComplete: firestoreProfile.onboardingComplete || false,
              hasViewedStatus: previousUserInLs?.hasViewedStatus || false,
              publicKey: firestoreProfile.publicKey,
            };
          } else {
            // This case is for first-time signup before profile is created.
            // Keys will be generated after profile setup.
            userToStore = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              avatarUrl: firebaseUser.photoURL || undefined,
              onboardingComplete: false,
              status: previousUserInLs?.status || undefined,
              hasViewedStatus: previousUserInLs?.hasViewedStatus || false,
            };
          }
          if (JSON.stringify(userToStore) !== JSON.stringify(previousUserInLs)) {
            setUserInLs(userToStore);
          }
        } catch (error) {
          console.error("[AuthObserver] Error fetching/processing Firestore profile:", error);
          const fallbackUser: User = {
            id: firebaseUser.uid, email: firebaseUser.email || '',
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            avatarUrl: firebaseUser.photoURL || undefined, onboardingComplete: false,
            status: previousUserInLs?.status || undefined,
            hasViewedStatus: previousUserInLs?.hasViewedStatus || false,
          };
           if (JSON.stringify(fallbackUser) !== JSON.stringify(previousUserInLs)) {
            setUserInLs(fallbackUser);
          }
        }
      } else {
        if (userInLs !== null) {
          setUserInLs(null);
        }
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUserInLs, userInLs]); 

  return null;
}
