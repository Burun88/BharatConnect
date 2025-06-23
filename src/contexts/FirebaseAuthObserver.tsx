
"use client";

import { useEffect, useRef } from 'react';
import { auth, onAuthUserChanged, type FirebaseUser, firestore } from '@/lib/firebase';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { User, ActiveSession } from '@/types'; // Use the main User type
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
      // Clean up previous user's Firestore listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = undefined;
      }

      if (firebaseUser) {
        console.log("[AuthObserver] Firebase user detected:", firebaseUser.uid);
        
        // Set up real-time listener for the current user's document
        const userDocRef = doc(firestore, 'bharatConnectUsers', firebaseUser.uid);
        unsubscribeRef.current = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const activeSession = data.activeSession as ActiveSession | undefined;

            console.log(`[AuthObserver] Firestore snapshot received for ${firebaseUser.uid}.`);
            console.log(`[AuthObserver] Local Session ID: ${localSessionId}`);
            console.log(`[AuthObserver] Firestore Session ID: ${activeSession?.sessionId}`);

            // If there's an active session in Firestore and it doesn't match the local one, force logout.
            if (localSessionId && activeSession && activeSession.sessionId !== localSessionId) {
              console.warn(`[AuthObserver] Session mismatch. Forcing logout on this device.`);
              
              toast({
                title: "Session Expired",
                description: "You have been logged out because you signed in on another device.",
                variant: 'destructive',
              });
              
              // Clear local state and sign out
              setUserInLs(null);
              setLocalSessionId(null);
              signOutUser(); // This will trigger the auth state change and redirect via AuthContext
              if (unsubscribeRef.current) {
                 unsubscribeRef.current(); // Stop listening after logout
              }
            }
          }
        });
        
        const previousUserInLs = userInLs;
        try {
          const firestoreProfile = await getUserFullProfile(firebaseUser.uid);
          let userToStore: User;

          if (firestoreProfile) {
            const localPrivateKey = localStorage.getItem(`privateKey_${firebaseUser.uid}`);
            if (!firestoreProfile.publicKey || !localPrivateKey) {
              await generateAndStoreKeyPair(firebaseUser.uid);
              const updatedProfile = await getUserFullProfile(firebaseUser.uid);
              if (updatedProfile) Object.assign(firestoreProfile, updatedProfile);
            }
            userToStore = { ...firestoreProfile, activeSession: firestoreProfile.activeSession || null };
          } else {
            userToStore = {
              id: firebaseUser.uid, email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              avatarUrl: firebaseUser.photoURL || undefined, onboardingComplete: false,
            };
          }
          if (JSON.stringify(userToStore) !== JSON.stringify(previousUserInLs)) {
            setUserInLs(userToStore);
          }
        } catch (error) {
          console.error("[AuthObserver] Error fetching/processing profile:", error);
          // Handle error case
        }
      } else { // No firebaseUser
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
  }, []); // Run only once

  return null;
}
