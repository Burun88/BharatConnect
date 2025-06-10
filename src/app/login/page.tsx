
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
import { getUserFullProfile } from '@/services/profileService';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [, setOnboardingCompleteLs] = useLocalStorage('onboardingComplete', false);
  const initialProfile = useMemo(() => ({ name: '', phone: '', email: '', photoURL: '', username: '' }), []);
  const [, setUserProfileLs] = useLocalStorage('userProfile', initialProfile);

  const handleUserSession = async (user: import('firebase/auth').User | null) => {
    if (isLoading) return;
    if (!user || !user.uid) {
      console.log("[Login Page] onAuthStateChanged: No user or UID detected.");
      setIsLoading(false);
      return;
    }

    console.log(`[Login Page] onAuthStateChanged/handleSubmit: User detected (UID: ${user.uid}). Checking profile status.`);
    setIsLoading(true);

    try {
      const bcProfile = await getUserFullProfile(user.uid);
      console.log(`[Login Page] BharatConnect Profile for UID ${user.uid}:`, bcProfile);

      if (bcProfile && bcProfile.onboardingComplete) {
        console.log(`[Login Page] BharatConnect profile found and onboarding complete for UID: ${user.uid}. Redirecting to home.`);
        setUserProfileLs({ name: bcProfile.name, phone: bcProfile.phone || '', email: bcProfile.email, photoURL: bcProfile.photoURL || '', username: '' });
        setOnboardingCompleteLs(true);
        router.replace('/');
      } else {
        console.log(`[Login Page] BharatConnect profile not found or onboarding incomplete for UID: ${user.uid}.`);
        setUserProfileLs(prev => ({
          ...initialProfile,
          email: user.email || '',
          name: bcProfile?.name || user.displayName || '',
          photoURL: bcProfile?.photoURL || user.photoURL || '',
        }));
        setOnboardingCompleteLs(false);
        router.replace('/profile-setup');
      }
    } catch (err: any) {
      console.error(`[Login Page] Error during profile check/data fetch for UID ${user.uid}:`, err);
      setError("Could not verify your profile status. Please try logging in again or contact support.");
      toast({
        variant: 'destructive',
        title: 'Profile Check Failed',
        description: err.message || 'Could not retrieve your profile information.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // const intendedProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID; // This was for .env based config
    // console.log(`[Login Page] Intended Firebase Project ID: ${intendedProjectId || "Not Set (Using hardcoded config)"}`);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !isLoading) {
        handleUserSession(user);
      } else if (!user && !isLoading) {
        console.log("[Login Page] onAuthStateChanged: No user detected, not currently logging in.");
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Check if the email exists
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);

      if (signInMethods.length === 0) {
        // Email does not exist
        toast({
          title: "Account Not Found 🤔",
          description: "It looks like there's no BharatConnect account for this email. Fancy creating one?",
          action: (
            <Button variant="outline" size="sm" onClick={() => router.push('/signup')}>
              Sign Up
            </Button>
          ),
        });
        setIsLoading(false);
        return;
      }

      // Step 2: Email exists, proceed with sign-in attempt
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the rest via handleUserSession if successful
      // No explicit setIsLoading(false) here because onAuthStateChanged > handleUserSession will manage it.
      // Or, if login fails, the catch block below will set it.

    } catch (err: any) {
      console.error("[Login Page] handleSubmit: Login error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
        toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'The password you entered is incorrect. Please try again.',
        });
      } else if (err.code === 'auth/invalid-email') {
        setError('The email address is not valid. Please check and try again.');
         toast({
            variant: 'destructive',
            title: 'Invalid Email',
            description: 'The email address format is not valid.',
        });
      } else {
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="large" />
          </div>
          <CardDescription className="text-muted-foreground pt-2">
            Sign in to continue to your BharatConnect account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
                required
                aria-describedby="login-error"
              />
            </div>
            {error && <p id="login-error" className="text-sm text-destructive text-center">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col space-y-3">
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={isLoading}>
              {isLoading ? 'Logging In...' : 'Login'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                Sign Up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
