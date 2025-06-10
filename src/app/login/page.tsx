
"use client";

import { useState, type FormEvent, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/shared/Logo';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, fetchSignInMethodsForEmail } from 'firebase/auth';
import { getUserFullProfile, type BharatConnectFirestoreUser } from '@/services/profileService';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';
import { Divide } from 'lucide-react'; // For "OR" divider

export default function LoginPageHub() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  // const [, setOnboardingCompleteLs] = useLocalStorage('onboardingComplete', false); // Replaced by userProfileLs.onboardingComplete
  
  // For redirecting if already logged in and onboarded
  // const [onboardingCompleteGlobal] = useLocalStorage('onboardingComplete', false);
  // const [userProfileGlobal] = useLocalStorage<LocalUserProfile | null>('userProfile', null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is logged in and onboarding was completed
        if (userProfileLs?.uid === user.uid && userProfileLs?.onboardingComplete) {
          console.log(`[Login Hub] User ${user.uid} already logged in and onboarded. Redirecting to /`);
          router.replace('/');
        }
      }
    });
    return () => unsubscribe();
  }, [router, userProfileLs]);

  const handleLoginSuccess = (user: import('firebase/auth').User, profile: BharatConnectFirestoreUser | null) => {
    if (profile && profile.onboardingComplete) {
      console.log(`[Login Hub] Profile found and onboarding complete for UID: ${user.uid}. Redirecting to home.`);
      setUserProfileLs({ // Store full profile for app use
        uid: user.uid,
        email: profile.email,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        phoneNumber: profile.phoneNumber,
        onboardingComplete: true,
      });
      // setOnboardingCompleteLs(true); // No longer needed
      router.replace('/');
    } else {
      console.log(`[Login Hub] Profile not found or onboarding incomplete for UID: ${user.uid}. Redirecting to profile-setup.`);
      setUserProfileLs({ // Store minimal info for profile setup
        uid: user.uid,
        email: user.email || '', // Ensure email is passed
        displayName: profile?.displayName || user.displayName || undefined, // Pre-fill if possible
        photoURL: profile?.photoURL || user.photoURL || undefined,
        onboardingComplete: false, // Onboarding is NOT complete
      });
      // setOnboardingCompleteLs(false); // No longer needed
      router.replace('/profile-setup');
    }
  };

  const handleContinue = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email.trim()) {
      setError('Please enter your email address.');
      setIsLoading(false);
      return;
    }
     if (!password.trim() && email.trim()) { 
         setError('Please enter your password to log in.');
         setIsLoading(false);
         return;
    }


    try {
      // Step 1: Attempt to sign in the user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log(`[Login Hub] Sign-in successful for UID: ${user.uid}. Checking profile status.`);
      
      const bcProfile = await getUserFullProfile(user.uid);
      handleLoginSuccess(user, bcProfile);

    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        console.warn(`[Login Hub] Handled login error - Code: ${err.code}. Message: Invalid email or password supplied by user.`);
        setError('Invalid email or password. Please try again or sign up.');
        toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'Incorrect email or password. New user? Please sign up.',
        });
      } else if (err.code === 'auth/invalid-email') {
        console.warn(`[Login Hub] Handled login error - Code: ${err.code}. Message: Invalid email format supplied by user.`);
        setError('The email address is not valid. Please check and try again.');
         toast({
            variant: 'destructive',
            title: 'Invalid Email',
            description: 'The email address format is not valid.',
        });
      } else {
        console.error("[Login Hub] Unhandled login error during signInWithEmailAndPassword:", err);
        setError(err.message || 'Failed to login. Please try again.');
        toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: err.message || 'An unexpected error occurred during login.',
        });
      }
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = () => {
    console.log("Google Sign-In clicked - To be implemented");
    toast({ title: "Coming Soon!", description: "Google Sign-In will be available soon." });
  };

  const handleForgotPassword = () => {
    console.log("Forgot Password clicked - To be implemented");
    if (!email.trim()) {
      toast({ title: "Email Required", description: "Please enter your email address to reset password.", variant: "default" });
      return;
    }
    toast({ title: "Password Reset", description: `If ${email} is a registered account, a password reset link will be sent.` });
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="large" />
          </div>
          <CardTitle className="text-2xl font-semibold">Welcome to BharatConnect</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Sign in or create an account to continue.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path d="M1 1h22v22H1z" fill="none" /></svg>
            Sign in with Google (Coming Soon)
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <form onSubmit={handleContinue} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-describedby="login-error"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="login-error" 
              />
            </div>
            {error && <p id="login-error" className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Continue'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col items-center space-y-3">
          <Button variant="link" size="sm" onClick={handleForgotPassword} className="text-xs text-muted-foreground hover:text-primary" disabled>
            Forgot Password? (Coming Soon)
          </Button>
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
