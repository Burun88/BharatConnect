
"use client";

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { User, ActiveSession } from '@/types';
import { auth, signInUser, signOutUser as fbSignOutUser, firestore, type FirebaseUser } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { generateAndStoreKeyPair } from '@/services/encryptionService'; // Import key generation

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
  const [authStepFromLS, setAuthStepFromLS] = useLocalStorage<AuthStep>('bharatconnect-auth-step', 'initial_loading');
  const [localSessionId, setLocalSessionId] = useLocalStorage<string | null>('bharatconnect-session-id', null);

  const [internalAuthStep, setInternalAuthStep] = useState<AuthStep>('initial_loading');
  const [isInitialAuthResolved, setIsInitialAuthResolved] = useState(false);
  const [sessionConflict, setSessionConflict] = useState<ActiveSession | null>(null);
  const [conflictingUser, setConflictingUser] = useState<FirebaseUser | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const pathname = usePathname();

  const stableUser = useMemo(() => {
    if (!userFromLS?.id) return null;
    return userFromLS;
  }, [userFromLS]);

  const isAuthenticated = useMemo(() => !!(stableUser?.id && stableUser?.onboardingComplete), [stableUser]);

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
    console.log(`[AuthContext] New session established: ${newSessionId}`);
  };

  const loginAndManageSession = async (email: string, pass: string) => {
    const userCredential = await signInUser(auth, email, pass);
    const uid = userCredential.user.uid;
    const userDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const existingSession = docSnap.data().activeSession as ActiveSession | undefined;
      if (existingSession?.sessionId && existingSession.sessionId !== localSessionId) {
        setConflictingUser(userCredential.user);
        setSessionConflict(existingSession);
        return; // Halt the login process
      }
    }
    // No session conflict, proceed to establish a new session.
    await establishSession(uid);
    // Observer will pick up user and redirect
  };

  const handleForceLogin = async () => {
    if (conflictingUser?.uid) {
      // Establish a new session for this device.
      await establishSession(conflictingUser.uid);
      // DO NOT generate new keys here. The observer will handle profile loading.
      // If the private key is missing on this device, the UI should prompt for restore.
      
      // Signal to the homepage that a restore is the next logical step after this forceful login
      sessionStorage.setItem('needs-restore-prompt', 'true');
      
      setSessionConflict(null);
      setConflictingUser(null);
      // The FirebaseAuthObserver will now see the logged-in user and handle the rest of the state updates.
    }
  };

  const handleCancelLogin = async () => {
    await fbSignOutUser(auth); // Sign out from the new device
    setSessionConflict(null);
    setConflictingUser(null);
    // Observer will clear user data, context will redirect to login/welcome.
  };

  useEffect(() => {
    let determinedStep: AuthStep;
    if (!stableUser?.id) {
      if (authStepFromLS === 'login' || authStepFromLS === 'signup') determinedStep = authStepFromLS;
      else determinedStep = 'welcome';
    } else if (!stableUser.onboardingComplete) {
      determinedStep = 'profile_setup';
    } else {
      determinedStep = 'authenticated';
    }
    if (internalAuthStep !== determinedStep) setInternalAuthStep(determinedStep);
    if (determinedStep !== authStepFromLS && authStepFromLS !== 'initial_loading') setAuthStepFromLS(determinedStep);
    if (!isInitialAuthResolved) setIsInitialAuthResolved(true);
  }, [stableUser, authStepFromLS, setAuthStepFromLS, isInitialAuthResolved, internalAuthStep]);

  useEffect(() => {
    if (!isInitialAuthResolved) return;
    const publicPaths = ['/welcome', '/login', '/signup', '/terms', '/privacy'];
    const profileSetupPaths = ['/profile-setup', '/verify-phone', '/verify-otp'];
    const isPublicPath = publicPaths.includes(pathname);
    const isProfileSetupPath = profileSetupPaths.includes(pathname);
    let targetPath: string | null = null;

    if (sessionConflict) return; // Don't redirect while conflict dialog is open

    switch (internalAuthStep) {
      case 'welcome': if (pathname !== '/welcome') targetPath = '/welcome'; break;
      case 'login': if (pathname !== '/login') targetPath = '/login'; break;
      case 'signup': if (pathname !== '/signup') targetPath = '/signup'; break;
      case 'profile_setup': if (!isProfileSetupPath) targetPath = '/profile-setup'; break;
      case 'authenticated': if (isPublicPath || isProfileSetupPath) targetPath = '/'; break;
      default:
        if (!isAuthenticated && !isPublicPath && !isProfileSetupPath) targetPath = '/welcome';
        else if (isAuthenticated && (isPublicPath || isProfileSetupPath)) targetPath = '/';
        break;
    }
    if (targetPath && targetPath !== pathname) router.replace(targetPath);
  }, [internalAuthStep, pathname, router, isAuthenticated, isInitialAuthResolved, sessionConflict]);

  const logout = useCallback(async () => {
    if (stableUser?.id) {
        const userDocRef = doc(firestore, 'bharatConnectUsers', stableUser.id);
        // Set the active session to null before signing out.
        await updateDoc(userDocRef, { activeSession: null });
    }
    await fbSignOutUser(auth);
    setLocalSessionId(null);
    // The observer will handle clearing user from LS and state will update.
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  }, [stableUser?.id, setLocalSessionId, toast]);

  const contextValue = useMemo(() => ({
    authUser: stableUser,
    setAuthUser: setUserFromLS,
    isAuthenticated,
    isAuthLoading: !isInitialAuthResolved,
    authStep: internalAuthStep,
    loginAndManageSession,
    logout
  }), [stableUser, setUserFromLS, isAuthenticated, isInitialAuthResolved, internalAuthStep, loginAndManageSession, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
        {children}
        <AlertDialog open={!!sessionConflict}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Already Logged In</AlertDialogTitle>
                    <AlertDialogDescription>
                        Your account is already logged in on another device. To continue here, you must log out the other session.
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
