
"use client";

import { useEffect } from 'react';
import { auth, onAuthUserChanged, type FirebaseUser } from '@/lib/firebase'; // Import auth
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';
import { getUserFullProfile } from '@/services/profileService';

export default function FirebaseAuthObserver() {
  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);

  useEffect(() => {
    const unsubscribe = onAuthUserChanged(auth, async (firebaseUser: FirebaseUser | null) => { // Pass auth instance
      if (firebaseUser) {
        console.log("[AuthObserver] Firebase user detected via onAuthUserChanged:", firebaseUser.uid, firebaseUser.email);

        let currentLocalProfileSnapshot: LocalUserProfile | null = null;
        try {
          const item = window.localStorage.getItem('userProfile');
          currentLocalProfileSnapshot = item ? JSON.parse(item) : null;
        } catch (e) { console.warn("[AuthObserver] Error reading initial userProfile from LS for snapshot:", e); }

        if (currentLocalProfileSnapshot && currentLocalProfileSnapshot.uid === firebaseUser.uid && currentLocalProfileSnapshot.onboardingComplete === true) {
          console.log("[AuthObserver] User is known from LS snapshot and already marked as onboarded. Refreshing basic info if needed.");
          const updatedProfile: LocalUserProfile = {
            ...currentLocalProfileSnapshot,
            email: firebaseUser.email || currentLocalProfileSnapshot.email || '',
            displayName: (currentLocalProfileSnapshot.displayName && !['User', firebaseUser.email?.split('@')[0]].includes(currentLocalProfileSnapshot.displayName))
                         ? currentLocalProfileSnapshot.displayName
                         : (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'),
            photoURL: currentLocalProfileSnapshot.photoURL || firebaseUser.photoURL || null,
            onboardingComplete: true, // Ensure onboardingComplete remains true from the snapshot
          };
          console.log("[AuthObserver] LS Snapshot path. Determined onboardingComplete to set:", updatedProfile.onboardingComplete);
          if (JSON.stringify(updatedProfile) !== JSON.stringify(currentLocalProfileSnapshot)) {
            setUserProfileLs(updatedProfile);
          }
        } else {
          console.log("[AuthObserver] User new/unknown in LS or not marked onboarded (or UID mismatch). Fetching from Firestore for UID:", firebaseUser.uid);
          try {
            const firestoreProfile = await getUserFullProfile(firebaseUser.uid);

            if (firestoreProfile) {
              const determinedOnboardingComplete = firestoreProfile.onboardingComplete || false;
              console.log(`[AuthObserver] Firestore profile for ${firebaseUser.uid} has raw onboardingComplete: ${firestoreProfile.onboardingComplete}. Determined to set: ${determinedOnboardingComplete}`);
              setUserProfileLs({
                uid: firebaseUser.uid,
                email: firestoreProfile.email || firebaseUser.email || '',
                displayName: firestoreProfile.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL: firestoreProfile.photoURL || firebaseUser.photoURL || null,
                phoneNumber: firestoreProfile.phoneNumber || null,
                bio: firestoreProfile.bio || null,
                onboardingComplete: determinedOnboardingComplete,
              });
            } else {
              console.log(`[AuthObserver] No Firestore profile for ${firebaseUser.uid}. Setting onboardingComplete: false.`);
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
            console.log(`[AuthObserver] Error fetching Firestore profile for ${firebaseUser.uid}. Setting onboardingComplete: false as fallback.`);
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
        console.log("[AuthObserver] Firebase user is null (signed out). Clearing userProfileLs.");
        if (userProfileLs !== null) {
          setUserProfileLs(null);
        }
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUserProfileLs]); // Removed userProfileLs from dependencies to prevent potential loops, auth instance doesn't change.

  return null;
}
