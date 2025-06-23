
"use client";

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { User, ActiveSession } from '@/types';
import { auth, signInUser, signOutUser as fbSignOutUser, firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

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

  const router = useRouter();
  const { toast } = useToast();
  const pathname = usePathname();

  const stableUser = useMemo(() => {
    if (!userFromLS?.id) return null;
    return userFromLS;
  }, [userFromLS]);

  const isAuthenticated = useMemo(() => !!(stableUser?.id && stableUser?.onboardingComplete), [stableUser]);

  const createNewSession = async (uid: string) => {
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
        setSessionConflict(existingSession);
        return; // Halt the login process until user makes a choice
      }
    }
    // No active session, proceed to create one
    await createNewSession(uid);
    // Observer will pick up user and redirect
  };

  const handleForceLogin = async () => {
    if (stableUser?.id) {
      await createNewSession(stableUser.id);
      setSessionConflict(null);
      // Let the regular auth flow continue
    }
  };

  const handleCancelLogin = async () => {
    await fbSignOutUser(auth); // Sign out from the new device
    setSessionConflict(null);
    // Observer will clear user data
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
        await updateDoc(userDocRef, { activeSession: null });
    }
    await fbSignOutUser(auth);
    setLocalSessionId(null);
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
  }), [stableUser, setUserFromLS, isAuthenticated, isInitialAuthResolved, internalAuthStep, logout]);

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
