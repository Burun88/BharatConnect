
'use client';

import { useEffect, useRef } from 'react';
import { auth, onAuthUserChanged, type FirebaseUser, firestore } from '@/lib/firebase';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { User, ActiveSession } from '@/types';
import { getUserFullProfile } from '@/services/profileService';
import { generateSessionKeyPair, hasLocalKeys } from '@/services/encryptionService';
import { doc, onSnapshot } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { signOutUser } from '@/lib/firebase';

export default function FirebaseAuthObserver() {
  const [userInLs, setUserInLs] = useLocalStorage<User | null>('bharatconnect-user', null);
  const [localSessionId, setLocalSessionId] = useLocalStorage<string | null>('bharatconnect-session-id', null);
  const unsubscribeRef = useRef<() => void | undefined>();

  useEffect(() => {
    const authUnsubscribe = onAuthUserChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = undefined;
      }

      if (firebaseUser) {
        console.log("[AuthObserver] Firebase user detected:", firebaseUser.uid);

        try {
          const firestoreProfile = await getUserFullProfile(firebaseUser.uid);
          
          if (firestoreProfile) { // Existing user, onboarding is complete or in progress
            if (JSON.stringify(firestoreProfile) !== JSON.stringify(userInLs)) {
              setUserInLs(firestoreProfile);
            }
            
            // This is a relogin on a new device for an EXISTING user.
            // It's now safe to generate a session key because we know their key vault exists.
            if (firestoreProfile.onboardingComplete && !hasLocalKeys(firebaseUser.uid)) {
              console.log(`[AuthObserver] Profile exists but no local keys for ${firebaseUser.uid}. Generating session key.`);
              await generateSessionKeyPair(firebaseUser.uid);
            }

            // Session hijacking check
            if (localSessionId) {
                const userDocRef = doc(firestore, 'bharatConnectUsers', firebaseUser.uid);
                unsubscribeRef.current = onSnapshot(userDocRef, (docSnap) => {
                    if (!docSnap.exists()) return;
                    const activeSession = docSnap.data().activeSession as ActiveSession | undefined;
                    if (activeSession?.sessionId && activeSession.sessionId !== localSessionId) {
                        console.warn(`[AuthObserver] Session mismatch detected. Forcing logout.`);
                        toast({
                            title: "Session Expired",
                            description: "You have been logged out because you signed in on another device.",
                            variant: 'destructive',
                        });
                        signOutUser();
                    }
                });
            }

          } else { // Brand new user, no profile in Firestore yet.
            console.log(`[AuthObserver] No Firestore profile found for ${firebaseUser.uid}. This is a new user.`);
            const userToStore: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              avatarUrl: firebaseUser.photoURL || undefined,
              onboardingComplete: false,
            };
            if (JSON.stringify(userToStore) !== JSON.stringify(userInLs)) {
              setUserInLs(userToStore);
            }
            // DO NOT generate keys here. This is the responsibility of the /profile-setup page.
          }
        } catch (error) {
          console.error("[AuthObserver] Error during profile/key handling:", error);
        }

      } else { // Logged out
        if (userInLs !== null) setUserInLs(null);
        if (localSessionId !== null) setLocalSessionId(null);
        if(userInLs?.id) {
          localStorage.removeItem(`keyVault_${userInLs.id}`);
        }
      }
    });

    return () => {
      authUnsubscribe();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSessionId]); // Depends on localSessionId to set up the snapshot listener

  return null;
}
