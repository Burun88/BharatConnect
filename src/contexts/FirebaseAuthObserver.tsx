
"use client";

import { useEffect, useRef } from 'react';
import { auth, onAuthUserChanged, type FirebaseUser, firestore } from '@/lib/firebase';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { User, ActiveSession } from '@/types';
import { getUserFullProfile } from '@/services/profileService';
import { generateAndStoreKeyPair } from '@/services/encryptionService';
import { doc, onSnapshot } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { signOutUser } from '@/lib/firebase';

export default function FirebaseAuthObserver() {
  const [userInLs, setUserInLs] = useLocalStorage<User | null>('bharatconnect-user', null);
  const [localSessionId, setLocalSessionId] = useLocalStorage<string | null>('bharatconnect-session-id', null);
  const unsubscribeRef = useRef<() => void | undefined>();

  useEffect(() => {
    const authUnsubscribe = onAuthUserChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      // Clean up previous user's Firestore listener if it exists
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = undefined;
      }

      if (firebaseUser) {
        console.log("[AuthObserver] Firebase user detected:", firebaseUser.uid);
        
        // This is a crucial check. If we are logging in, the localSessionId might not be set yet.
        // We let the login flow handle the initial session check. The observer's job is to
        // watch for takeovers *after* we are already in a session.
        if (localSessionId) {
          const userDocRef = doc(firestore, 'bharatConnectUsers', firebaseUser.uid);
          unsubscribeRef.current = onSnapshot(userDocRef, (docSnap) => {
            if (!docSnap.exists()) return;
            
            const data = docSnap.data();
            const activeSession = data.activeSession as ActiveSession | undefined;

            // This is the core logic for detecting a session takeover.
            // If there's a session ID in Firestore and it does NOT match our local one,
            // it means another device has logged in and taken over.
            if (activeSession?.sessionId && activeSession.sessionId !== localSessionId) {
              console.warn(`[AuthObserver] Session mismatch detected. Remote: ${activeSession.sessionId}, Local: ${localSessionId}. Forcing logout.`);
              
              toast({
                title: "Session Expired",
                description: "You have been logged out because you signed in on another device.",
                variant: 'destructive',
              });
              
              signOutUser(); // This triggers the auth state change, which will clean up everything else.
            }
          });
        }
        
        // Always try to fetch the latest profile and update local state
        try {
          const firestoreProfile = await getUserFullProfile(firebaseUser.uid);
          let userToStore: User;

          if (firestoreProfile) {
            // After fetching the profile, ensure keys exist. This is the correct place.
            await generateAndStoreKeyPair(firebaseUser.uid);
            userToStore = firestoreProfile;
          } else {
            // This case handles a brand new user who hasn't completed onboarding.
            userToStore = {
              id: firebaseUser.uid, email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              avatarUrl: firebaseUser.photoURL || undefined, onboardingComplete: false,
            };
          }
          // Only update local storage if the data has actually changed to prevent render loops
          if (JSON.stringify(userToStore) !== JSON.stringify(userInLs)) {
            setUserInLs(userToStore);
          }
        } catch (error) {
          console.error("[AuthObserver] Error fetching/processing profile:", error);
        }
      } else { // No firebaseUser (logged out)
        if (userInLs !== null) setUserInLs(null);
        if (localSessionId !== null) setLocalSessionId(null);
      }
    });

    return () => {
      authUnsubscribe();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSessionId]); // Re-run if localSessionId changes, so we can attach the listener

  return null;
}
