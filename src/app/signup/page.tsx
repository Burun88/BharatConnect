
"use client";

import { useState, type FormEvent, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/shared/Logo'; // Assuming you have a Logo component
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const initialProfile = {} as LocalUserProfile;
  const [, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', initialProfile);
  const [, setOnboardingCompleteLs] = useLocalStorage('onboardingComplete', false);
  const [onboardingCompleteGlobal] = useLocalStorage('onboardingComplete', false); // Read global, don't set
  const [userProfileGlobal] = useLocalStorage<LocalUserProfile | null>('userProfile', null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is somehow already logged in and fully onboarded, redirect from signup
        if (userProfileGlobal?.uid === user.uid && onboardingCompleteGlobal) {
             router.replace('/');
        }
      }
    });
    return () => unsubscribe();
  }, [router, onboardingCompleteGlobal, userProfileGlobal]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user || !user.uid || !user.email) {
        console.error("[Signup Page] handleSubmit: Signup successful but user object, UID or email is missing.");
        setError("Signup failed: User session is invalid. Please try again or contact support.");
        toast({ variant: 'destructive', title: 'Signup Failed', description: 'User session is invalid after signup.' });
        setIsLoading(false);
        return;
      }
      
      console.log(`[Signup Page] handleSubmit: Firebase Auth account created for UID: ${user.uid}. Email: ${user.email}. Proceeding to profile setup.`);
      
      // Store minimal info needed for profile setup
      setUserProfileLs({ 
        uid: user.uid, 
        email: user.email,
      });
      setOnboardingCompleteLs(false); 
      
      console.log(`[Signup Page] Redirecting to profile-setup for UID: ${user.uid}.`);
      router.push('/profile-setup'); // Redirect to profile setup

    } catch (err: any) {
      console.error("[Signup Page] handleSubmit: Signup error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login or use a different email.');
         toast({
            variant: 'destructive',
            title: 'Email Already Registered',
            description: (
              <span>
                This email is already in use. Please{' '}
                <Link href="/login" className="underline">Login</Link> or try a different one.
              </span>
            ),
        });
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
        toast({
            variant: 'destructive',
            title: 'Signup Failed',
            description: err.message || 'An unexpected error occurred.',
        });
      }
    } finally {
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
          <CardTitle className="text-3xl font-headline font-bold text-gradient-primary-accent">
            Create Your Account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Join BharatConnect to connect with India!
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
                aria-describedby="signup-error"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="•••••••• (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-describedby="signup-error"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                aria-describedby="signup-error"
              />
            </div>
            {error && <p id="signup-error" className="text-sm text-destructive text-center">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col space-y-3">
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Sign Up & Continue'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
