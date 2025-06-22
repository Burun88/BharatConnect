
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/shared/Logo';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';
import { auth, createUser } from '@/lib/firebase'; 
import type { AuthStep } from '@/contexts/AuthContext'; // Added import
import { Loader2 } from 'lucide-react'; // Import Loader2

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const router = useRouter();
  const { toast } = useToast();

  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  const [isLoadingPage, setIsLoadingPage] = useState(true); 
  const [, setAuthStepFromLS] = useLocalStorage<AuthStep>('bharatconnect-auth-step', 'initial_loading');


  useEffect(() => {
    if (userProfileLs) { 
      if (userProfileLs.uid && userProfileLs.onboardingComplete) {
        router.replace('/');
        return;
      } else if (userProfileLs.uid && !userProfileLs.onboardingComplete) {
        // If user is here but already has a profile in LS indicating onboarding isn't complete,
        // let them proceed to profile-setup or stay if they are already there.
        // This case is more relevant for direct navigation to /signup, not typically after a new signup.
        // However, to be safe, if they somehow land here and are mid-onboarding, let profile-setup handle it.
        // router.replace('/profile-setup'); // This could cause a loop if they are trying to re-signup.
                                          // Better to just let them see the signup form or redirect if fully onboarded.
      }
    }
    setIsLoadingPage(false); 
  }, [userProfileLs, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      setIsSubmitting(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      setIsSubmitting(false);
      return;
    }

    try {
      const userCredential = await createUser(auth, email, password);
      console.log("[Signup Page] Firebase Account Created:", userCredential.user.uid);

      // Set initial basic profile in local storage immediately
      // to ensure profile-setup page has the necessary data.
      setUserProfileLs({
        uid: userCredential.user.uid,
        email: userCredential.user.email || '',
        onboardingComplete: false,
        displayName: userCredential.user.email?.split('@')[0] || 'User', // Default display name
        photoURL: null,
        phoneNumber: null,
        bio: null, 
      });

      // The "Account Created!" toast has been removed from here.
      // Navigation will happen, and profile-setup will show a welcome.
      
      router.push('/profile-setup'); 
      // setIsSubmitting will implicitly be false when the component unmounts on navigation
    } catch (err: any) {
      console.error("[Signup Page] Firebase Signup Error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login or use a different email.');
        toast({ variant: 'destructive', title: 'Signup Failed', description: 'Email already in use.' });
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
        toast({ variant: 'destructive', title: 'Signup Failed', description: 'Password is too weak.' });
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format. Please check your email address.');
        toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please enter a valid email address.' });
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection and try again.');
        toast({ variant: 'destructive', title: 'Network Error', description: 'Could not connect to authentication service.' });
      }
      else {
        setError('An unexpected error occurred during signup. Please try again.');
        toast({ variant: 'destructive', title: 'Signup Error', description: err.message || 'An unexpected error occurred.' });
      }
      setIsSubmitting(false); // Re-enable form only on error
    }
    // No finally block to set isSubmitting to false, as successful navigation unmounts.
  };

  const handleLoginLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setAuthStepFromLS('login');
    router.push('/login');
  };
  
  if (isLoadingPage) {
    return (
      <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-muted-foreground text-center">Loading...</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="large" />
          </div>
          <CardTitle className="text-3xl font-semibold text-gradient-primary-accent">Create Account</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>
            {error && <p id="signup-error" className="text-sm text-destructive text-center">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col space-y-3">
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Sign Up & Continue'
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" onClick={handleLoginLinkClick} className="text-primary hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
