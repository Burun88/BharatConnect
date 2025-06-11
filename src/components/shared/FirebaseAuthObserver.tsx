
"use client";

import { useEffect } from 'react';
import { onAuthUserChanged, type FirebaseUser } from '@/lib/firebase';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';
import { getUserFullProfile } from '@/services/profileService'; // Added import

export default function FirebaseAuthObserver() {
  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);

  useEffect(() => {
    const unsubscribe = onAuthUserChanged(async (firebaseUser: FirebaseUser | null) => { // Made async
      if (firebaseUser) {
        console.log("[AuthObserver] Firebase user detected via onAuthUserChanged:", firebaseUser.uid, firebaseUser.email);

        // Read local storage directly to get the freshest value before async operations
        let currentLocalProfileSnapshot: LocalUserProfile | null = null;
        try {
          const item = window.localStorage.getItem('userProfile');
          currentLocalProfileSnapshot = item ? JSON.parse(item) : null;
        } catch (e) { console.warn("[AuthObserver] Error reading initial userProfile from LS for snapshot:", e); }

        if (currentLocalProfileSnapshot && currentLocalProfileSnapshot.uid === firebaseUser.uid && currentLocalProfileSnapshot.onboardingComplete === true) {
          console.log("[AuthObserver] User is known from LS snapshot and already marked as onboarded. Refreshing basic info if needed.");
          // User is known and fully onboarded according to current local storage.
          // We can update basic Firebase auth details if they've changed (e.g., email verification status, though not used here).
          // And ensure local displayName/photoURL aren't overwritten by generic Firebase ones if user customized them.
          const updatedProfile = {
            ...currentLocalProfileSnapshot, // Start with all existing LS data
            email: firebaseUser.email || currentLocalProfileSnapshot.email || '',
            displayName: (currentLocalProfileSnapshot.displayName && !['User', firebaseUser.email?.split('@')[0]].includes(currentLocalProfileSnapshot.displayName))
                         ? currentLocalProfileSnapshot.displayName
                         : (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'),
            photoURL: currentLocalProfileSnapshot.photoURL || firebaseUser.photoURL || null,
          };
          // Only update LS if there's an actual change to avoid unnecessary re-renders.
          if (JSON.stringify(updatedProfile) !== JSON.stringify(currentLocalProfileSnapshot)) {
            setUserProfileLs(updatedProfile);
          }
        } else {
          // User is new to this browser, or LS doesn't say they are onboarded, or it's a different user.
          // Fetch full profile from Firestore to get the authoritative onboardingComplete status.
          console.log("[AuthObserver] User new/unknown in LS or not marked onboarded. Fetching from Firestore for UID:", firebaseUser.uid);
          try {
            const firestoreProfile = await getUserFullProfile(firebaseUser.uid);

            if (firestoreProfile) { // Profile exists in Firestore
              console.log("[AuthObserver] Firestore profile fetched. Onboarding status from Firestore:", firestoreProfile.onboardingComplete);
              setUserProfileLs({
                uid: firebaseUser.uid,
                email: firestoreProfile.email || firebaseUser.email || '',
                displayName: firestoreProfile.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL: firestoreProfile.photoURL || firebaseUser.photoURL || null,
                phoneNumber: firestoreProfile.phoneNumber || null,
                bio: firestoreProfile.bio || null,
                onboardingComplete: firestoreProfile.onboardingComplete || false, // Default to false if undefined in Firestore
              });
            } else {
              // No profile in Firestore. This could be a brand new Firebase Auth user
              // who hasn't gone through our app's /signup process which creates the Firestore doc.
              // Or, they signed up, Firebase Auth user created, but Firestore doc creation failed.
              // Default to not onboarded.
              console.log("[AuthObserver] No profile found in Firestore for UID:", firebaseUser.uid, ". Setting onboardingComplete: false.");
              setUserProfileLs({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL: firebaseUser.photoURL || null,
                phoneNumber: null,
                bio: null,
                onboardingComplete: false,
              });
            }
          } catch (error) {
            console.error("[AuthObserver] Error fetching Firestore profile:", error);
            // Fallback: treat as not onboarded to be safe if Firestore fetch fails.
            setUserProfileLs({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              photoURL: firebaseUser.photoURL || null,
              phoneNumber: null,
              bio: null,
              onboardingComplete: false,
            });
          }
        }
      } else {
        // User is signed out
        console.log("[AuthObserver] Firebase user is null (signed out). Clearing userProfileLs.");
        if (userProfileLs !== null) { // Only update if it's not already null
          setUserProfileLs(null);
        }
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUserProfileLs]); // userProfileLs is intentionally not in deps to prevent potential loops if read directly inside effect without snapshot.
                          // getUserFullProfile is a stable import.

  return null;
}
