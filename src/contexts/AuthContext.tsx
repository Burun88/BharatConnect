
"use client";

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { User, ActiveSession } from '@/types';
import { auth, signInUser, signOutUser as fbSignOutUser, onAuthUserChanged, firestore, type FirebaseUser } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { generateSessionKeyPair, hasLocalKeys, generateInitialKeyPair } from '@/services/encryptionService';
import { getUserFullProfile, createOrUpdateUserFullProfile } from '@/services/profileService';


interface AuthContextType {
  authUser: User | null;
  setAuthUser: (userOrUpdater: User | null | ((prevUser: User | null) => User | null)) => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authStep: AuthStep;
  loginAndManageSession: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

export type AuthStep =
  | 'initial_loading'
  | 'welcome'
  | 'login'
  | 'signup'
  | 'profile_setup'
  | 'authenticated'
  | 'error';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const generateSessionId = () => crypto.randomUUID();
const getDeviceInfo = () => navigator.userAgent;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [userFromLS, setUserFromLS] = useLocalStorage<User | null>('bharatconnect-user', null);
  const [localSessionId, setLocalSessionId] = useLocalStorage<string | null>('bharatconnect-session-id', null);

  const [isInitialAuthResolved, setIsInitialAuthResolved] = useState(false);
  const [sessionConflict, setSessionConflict] = useState<ActiveSession | null>(null);
  const [conflictingUser, setConflictingUser] = useState<FirebaseUser | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const pathname = usePathname();
  const sessionCheckUnsubscribeRef = useRef<() => void | undefined>();

  const isAuthenticated = useMemo(() => !!(userFromLS?.id && userFromLS?.onboardingComplete), [userFromLS]);

  const authStep: AuthStep = useMemo(() => {
    if (!isInitialAuthResolved) return 'initial_loading';
    if (!userFromLS?.id) return 'welcome';
    if (!userFromLS.onboardingComplete) return 'profile_setup';
    return 'authenticated';
  }, [isInitialAuthResolved, userFromLS]);

  const upsertKeyVault = async (uid: string): Promise<void> => {
    const vaultRef = doc(firestore, 'userKeyVaults', uid);
    try {
        const vaultSnap = await getDoc(vaultRef);
        if (!vaultSnap.exists()) {
            // This is a brand new user, vault doesn't exist yet.
            // The vault will be created during the profile setup's `generateInitialKeyPair` call.
            console.log(`[AuthContext] User vault for ${uid} does not exist. It will be created during profile setup.`);
            return;
        }

        // This is an existing user on a new device.
        console.log(`[AuthContext] User vault for ${uid} exists. Generating session key.`);
        await generateSessionKeyPair(uid);

    } catch (error) {
        console.error(`[AuthContext] Error in upsertKeyVault for UID ${uid}:`, error);
        // We throw the error so the calling function knows something went wrong.
        throw new Error("Failed to create or update the key vault.");
    }
  };

  useEffect(() => {
    const authUnsubscribe = onAuthUserChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (sessionCheckUnsubscribeRef.current) {
        sessionCheckUnsubscribeRef.current();
        sessionCheckUnsubscribeRef.current = undefined;
      }

      if (firebaseUser) {
        try {
          const firestoreProfile = await getUserFullProfile(firebaseUser.uid);
          
          if (firestoreProfile) {
            setUserFromLS(firestoreProfile);
            if (firestoreProfile.onboardingComplete && !hasLocalKeys(firebaseUser.uid)) {
              await upsertKeyVault(firebaseUser.uid);
            }

            if (localSessionId) {
              const userDocRef = doc(firestore, 'bharatConnectUsers', firebaseUser.uid);
              sessionCheckUnsubscribeRef.current = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                  const activeSession = docSnap.data().activeSession as ActiveSession | undefined;
                  if (activeSession?.sessionId && activeSession.sessionId !== localSessionId) {
                    toast({ title: "Session Expired", description: "You signed in on another device.", variant: 'destructive' });
                    fbSignOutUser(auth);
                  }
                }
              });
            }
          } else {
            // Profile creation is now handled explicitly at signup.
            // If the profile is not found here, it's a temporary sync issue or an error state.
            // We will NOT create a new profile here to avoid the bug where existing users are reset.
            console.warn(`[AuthContext] Firestore profile not found for user ${firebaseUser.uid}. This may be a temporary sync lag after signup.`);
            // Do not resolve auth yet. Let's wait for the profile to appear.
            // A production app might have a timeout here to prevent getting stuck.
          }
        } catch (error) {
          console.error("[AuthContext] Error during auth state change handling:", error);
          setUserFromLS(null);
        } finally {
           // We only resolve if we are definitively logged out, or have found a profile.
           // This prevents a "flash" of the login screen for existing users if their profile read is slow.
           const finalProfile = await getUserFullProfile(firebaseUser.uid);
           if (finalProfile || !firebaseUser) {
             setIsInitialAuthResolved(true);
           }
        }
      } else {
        setUserFromLS(null);
        if(userFromLS?.id) {
          localStorage.removeItem(`keyVault_${userFromLS.id}`);
        }
        setLocalSessionId(null);
        setIsInitialAuthResolved(true);
      }
    });

    return () => {
      authUnsubscribe();
      if (sessionCheckUnsubscribeRef.current) {
        sessionCheckUnsubscribeRef.current();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSessionId]);

  // Routing Logic
  useEffect(() => {
    if (!isInitialAuthResolved) return;
    const publicPaths = ['/welcome', '/login', '/signup', '/terms', '/privacy'];
    const profileSetupPaths = ['/profile-setup', '/verify-phone', '/verify-otp'];
    const isPublicPath = publicPaths.includes(pathname) || publicPaths.some(p => pathname.startsWith(p) && p !== '/');
    const isProfileSetupPath = profileSetupPaths.includes(pathname) || profileSetupPaths.some(p => pathname.startsWith(p) && p !== '/');
    let targetPath: string | null = null;
    
    if (sessionConflict) return;

    switch (authStep) {
      case 'welcome':
      case 'login':
      case 'signup':
        if (!isPublicPath) targetPath = '/welcome'; break;
      case 'profile_setup': if (!isProfileSetupPath) targetPath = '/profile-setup'; break;
      case 'authenticated': if (isPublicPath || isProfileSetupPath) targetPath = '/'; break;
      case 'initial_loading': break;
      default:
        if (!isAuthenticated && !isPublicPath && !isProfileSetupPath) targetPath = '/welcome';
        else if (isAuthenticated && (isPublicPath || isProfileSetupPath)) targetPath = '/';
        break;
    }
    
    if (targetPath && targetPath !== pathname) {
      router.replace(targetPath);
    }
  }, [authStep, pathname, router, isAuthenticated, isInitialAuthResolved, sessionConflict]);


  const establishSession = async (uid: string) => {
    const newSessionId = generateSessionId();
    const newSession: ActiveSession = {
      sessionId: newSessionId,
      loggedInAt: serverTimestamp(),
      deviceInfo: getDeviceInfo(),
    };
    const userDocRef = doc(firestore, 'bharatConnectUsers', uid);
    await updateDoc(userDocRef, { activeSession: newSession });
    setLocalSessionId(newSessionId);
  };

  const loginAndManageSession = async (email: string, pass: string) => {
    const userCredential = await signInUser(auth, email, pass);
    const uid = userCredential.user.uid;
    const userDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const existingSession = docSnap.data().activeSession as ActiveSession | undefined;
      if (existingSession?.sessionId) {
        setConflictingUser(userCredential.user);
        setSessionConflict(existingSession);
        return;
      }
    }
    await establishSession(uid);
  };

  const handleForceLogin = async () => {
    if (conflictingUser?.uid) {
      await establishSession(conflictingUser.uid);
      setSessionConflict(null);
      setConflictingUser(null);
    }
  };

  const handleCancelLogin = async () => {
    await fbSignOutUser(auth);
    setSessionConflict(null);
    setConflictingUser(null);
  };

  const logout = useCallback(async () => {
    if (userFromLS?.id) {
        try {
            const userDocRef = doc(firestore, 'bharatConnectUsers', userFromLS.id);
            await updateDoc(userDocRef, { activeSession: null });
        } catch (error) {
            console.warn("Could not clear active session on logout, may already be gone.", error);
        }
    }
    await fbSignOutUser(auth);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  }, [userFromLS?.id, toast]);

  const contextValue = useMemo(() => ({
    authUser: userFromLS,
    setAuthUser: setUserFromLS,
    isAuthenticated,
    isAuthLoading: !isInitialAuthResolved,
    authStep,
    loginAndManageSession,
    logout
  }), [userFromLS, setUserFromLS, isAuthenticated, isInitialAuthResolved, authStep, loginAndManageSession, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
        {children}
        <AlertDialog open={!!sessionConflict}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Already Logged In</AlertDialogTitle>
                    <AlertDialogDescription>
                        Your account is active on another device. Continuing here will log out the other session.
                        <br/><br/>
                        <span className="text-xs text-muted-foreground bg-muted p-2 rounded-md block">
                           Device Info: {sessionConflict?.deviceInfo || 'Unknown'}
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancelLogin}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleForceLogin}>Log Out Other Device</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
