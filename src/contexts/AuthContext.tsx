
"use client";

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { User } from '@/types'; // User type is now simplified
import { auth, signOutUser as fbSignOutUser } from '@/lib/firebase';

interface AuthContextType {
  authUser: User | null;
  setAuthUser: (userOrUpdater: User | null | ((prevUser: User | null) => User | null)) => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authStep: AuthStep;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 'bharatconnect-user' in localStorage now stores a simplified User object (no aura fields)
  const [userFromLS, setUserFromLS] = useLocalStorage<User | null>('bharatconnect-user', null);
  const [authStepFromLS, setAuthStepFromLS] = useLocalStorage<AuthStep>('bharatconnect-auth-step', 'initial_loading');

  const [internalAuthStep, setInternalAuthStep] = useState<AuthStep>('initial_loading');
  const [isInitialAuthResolved, setIsInitialAuthResolved] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // The stableUser is now directly userFromLS as aura logic is removed from here.
  const stableUser = useMemo(() => {
    console.log(`[AuthContext SU] stableUser useMemo triggered. Raw userFromLS:`, JSON.parse(JSON.stringify(userFromLS || {})));
    if (!userFromLS?.id) {
      return null;
    }
    // Ensure all properties of User type are present, even if undefined/null
    return {
      id: userFromLS.id,
      name: userFromLS.name || 'User',
      email: userFromLS.email || '',
      username: userFromLS.username || undefined,
      phone: userFromLS.phone || undefined,
      avatarUrl: userFromLS.avatarUrl || undefined,
      status: userFromLS.status || undefined,
      hasViewedStatus: userFromLS.hasViewedStatus === true,
      onboardingComplete: userFromLS.onboardingComplete === true,
      bio: userFromLS.bio || undefined,
    };
  }, [userFromLS]);

  const isAuthenticated = useMemo(() => {
    const authStatus = !!(stableUser?.id && stableUser?.onboardingComplete);
    return authStatus;
  }, [stableUser]);

  useEffect(() => {
    let determinedStep: AuthStep;
    if (!stableUser?.id) {
      if (authStepFromLS === 'login' || authStepFromLS === 'signup') {
        determinedStep = authStepFromLS;
      } else {
        determinedStep = 'welcome';
      }
    } else if (!stableUser.onboardingComplete) {
      determinedStep = 'profile_setup';
    } else {
      determinedStep = 'authenticated';
    }

    if (internalAuthStep !== determinedStep) {
       setInternalAuthStep(determinedStep);
    }
    if (determinedStep !== authStepFromLS && authStepFromLS !== 'initial_loading') {
      setAuthStepFromLS(determinedStep);
    }

    if (!isInitialAuthResolved) {
      setIsInitialAuthResolved(true);
    }
  }, [stableUser, authStepFromLS, setAuthStepFromLS, isInitialAuthResolved, internalAuthStep]);

  useEffect(() => {
    if (!isInitialAuthResolved) return;

    const publicPaths = ['/welcome', '/login', '/signup', '/terms', '/privacy'];
    const profileSetupPaths = ['/profile-setup', '/verify-phone', '/verify-otp'];
    const isPublicPath = publicPaths.includes(pathname);
    const isProfileSetupPath = profileSetupPaths.includes(pathname);
    let targetPath: string | null = null;

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
  }, [internalAuthStep, pathname, router, isAuthenticated, isInitialAuthResolved]);

  const logout = useCallback(async () => {
    try {
      await fbSignOutUser(auth);
      // FirebaseAuthObserver will handle clearing userFromLS
    } catch (error) {
      console.error("[AuthContext logout] Error:", error);
      setInternalAuthStep('error'); // Potentially set an error state
    }
  }, []);

  const contextValue = useMemo(() => ({
    authUser: stableUser,
    setAuthUser: setUserFromLS, // This updates 'bharatconnect-user' in localStorage
    isAuthenticated,
    isAuthLoading: !isInitialAuthResolved,
    authStep: internalAuthStep,
    logout
  }), [stableUser, setUserFromLS, isAuthenticated, isInitialAuthResolved, internalAuthStep, logout]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
