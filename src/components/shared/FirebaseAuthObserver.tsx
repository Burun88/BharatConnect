
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
        const currentLocalProfile = userProfileLs; // From useLocalStorage, reflects current state in localStorage

        if (currentLocalProfile && currentLocalProfile.uid === firebaseUser.uid && currentLocalProfile.onboardingComplete === true) {
          // Case 1: User is known, UID matches, and onboarding IS complete.
          // Preserve local details like displayName, photoURL, phoneNumber as they were set during profile setup.
          // Update core Firebase props like uid and email for accuracy.
          setUserProfileLs({
            ...currentLocalProfile,
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            // If Firebase auth has a more recent photoURL (e.g. from Google Sign-In later), it could be used,
            // but for email/pass, local one is likely more up-to-date if set during profile setup.
            photoURL: currentLocalProfile.photoURL || firebaseUser.photoURL || null,
          });
        } else {
          // Case 2: User is new, or UID doesn't match local storage, or onboarding is NOT complete for this UID.
          // Construct a fresh profile for local storage.
          // Prioritize Firebase auth data for displayName and photoURL if user is not fully onboarded.
          
          // Determine the onboarding status:
          // If currentLocalProfile exists, UID matches, and it has an onboardingComplete field, use that.
          // Otherwise, default to false (meaning user needs to go through or complete onboarding).
          const previousOnboardingStatusForThisUser = 
            (currentLocalProfile && currentLocalProfile.uid === firebaseUser.uid)
              ? (currentLocalProfile.onboardingComplete || false)
              : false;

          setUserProfileLs({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            // For displayName and photoURL, if not fully onboarded, ALWAYS use Firebase's info or a generic default.
            // Do NOT use currentLocalProfile.displayName/photoURL if onboarding isn't complete to avoid stale "Demo User" type issues.
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            photoURL: firebaseUser.photoURL || null,
            // Preserve phone number only if user was in the middle of profile setup for *this* UID but hadn't finished onboarding
            phoneNumber: (currentLocalProfile && currentLocalProfile.uid === firebaseUser.uid && !previousOnboardingStatusForThisUser) 
                         ? currentLocalProfile.phoneNumber 
                         : null,
            onboardingComplete: previousOnboardingStatusForThisUser,
          });
        }
      } else {
        // User is signed out
        console.log("[AuthObserver] User signed out.");
        setUserProfileLs(null);
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUserProfileLs]); // userProfileLs is intentionally not in deps to avoid potential loops.

  return null;
}
