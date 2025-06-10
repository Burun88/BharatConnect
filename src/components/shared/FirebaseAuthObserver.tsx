
"use client";

import { useEffect } from 'react';
import { onAuthUserChanged, type FirebaseUser } from '@/lib/firebase';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';

export default function FirebaseAuthObserver() {
  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);

  useEffect(() => {
    const unsubscribe = onAuthUserChanged((firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in
        console.log("[AuthObserver] User signed in:", firebaseUser.uid, firebaseUser.email);
        const currentLocalProfile = userProfileLs;
        let newProfileData: LocalUserProfile;

        if (currentLocalProfile && currentLocalProfile.uid === firebaseUser.uid && currentLocalProfile.onboardingComplete) {
          // Case 1: User is known, onboarded, and UID matches.
          // Preserve local details set during profile setup, but update core Firebase props.
          newProfileData = {
            ...currentLocalProfile, // Start with existing onboarded data
            uid: firebaseUser.uid,   // Always update from Firebase auth
            email: firebaseUser.email || '', // Always update from Firebase auth
            // displayName, photoURL from currentLocalProfile are preferred as they were set during profile setup.
            // Supplement photoURL from Firebase if local one is missing.
            photoURL: currentLocalProfile.photoURL || firebaseUser.photoURL || null,
            onboardingComplete: true, // Should already be true
          };
        } else {
          // Case 2: New user, user on a new device, user didn't complete onboarding, or UID mismatch.
          // If UID mismatches, currentLocalProfile is stale data for a *different* user.
          // If UID matches but onboardingComplete is false, they are in the process of setting up.

          const onboardingStatusFromLocalStorage = 
            (currentLocalProfile && currentLocalProfile.uid === firebaseUser.uid)
              ? (currentLocalProfile.onboardingComplete || false)
              : false;

          newProfileData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            // For displayName, use Firebase's version if available (often null for new email/pass users),
            // otherwise derive from email or use a generic 'User'.
            // This explicitly avoids using a potentially stale currentLocalProfile.displayName if not onboarded.
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            // For photoURL, use Firebase's version (often null for new email/pass users).
            photoURL: firebaseUser.photoURL || null,
            // For phoneNumber, if they started profile setup (UID matches but not onboarded)
            // and entered a phone number, it might be in currentLocalProfile.
            phoneNumber: (currentLocalProfile && currentLocalProfile.uid === firebaseUser.uid && !onboardingStatusFromLocalStorage)
                         ? currentLocalProfile.phoneNumber
                         : null,
            onboardingComplete: onboardingStatusFromLocalStorage,
          };
        }
        setUserProfileLs(newProfileData);

      } else {
        // User is signed out
        console.log("[AuthObserver] User signed out.");
        setUserProfileLs(null);
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUserProfileLs]); // userProfileLs is intentionally not in deps to avoid potential loops.
                          // The observer primarily reacts to Firebase auth state changes.

  return null;
}
