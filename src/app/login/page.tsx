
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
import { auth, signInUser, resetUserPassword } from '@/lib/firebase'; 

export default function LoginPageHub() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  const [isLoadingPage, setIsLoadingPage] = useState(true); 
  
  useEffect(() => {
    if (userProfileLs) { 
      if (userProfileLs.uid && userProfileLs.onboardingComplete) {
        console.log(`[Login Hub] User ${userProfileLs.uid} from LS is onboarded. Redirecting to /`);
        router.replace('/');
        return; 
      } else if (userProfileLs.uid && !userProfileLs.onboardingComplete) {
        console.log(`[Login Hub] User ${userProfileLs.uid} from LS is logged in but NOT onboarded. Redirecting to /profile-setup`);
        router.replace('/profile-setup');
        return;
      }
      setIsLoadingPage(false);
    } else {
      setIsLoadingPage(false); 
    }
  }, [userProfileLs, router]);

  const handleContinue = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email.trim()) {
      setError('Please enter your email address.');
      setIsSubmitting(false);
      return;
    }
     if (!password.trim() && email.trim()) { 
         setError('Please enter your password to log in.');
         setIsSubmitting(false);
         return;
    }

    try {
      const userCredential = await signInUser(auth, email, password);
      console.log("[Login Hub] Firebase SignIn Success:", userCredential.user.uid);
      // FirebaseAuthObserver will handle setting LocalStorage.
      // Redirection is handled by the useEffect hook listening to userProfileLs changes.
      toast({
        title: 'Login Successful!',
        description: `Welcome back, ${userCredential.user.email || 'user'}!`,
      });
    } catch (err: any) {
      console.error("[Login Hub] Firebase SignIn Error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Incorrect email or password. If you\'re new, please Sign Up!');
        toast({
            variant: 'destructive',
            title: "Hmm, Let's Check Those Details...",
            description: "We couldn't find an account with that email and password. If you're new to BharatConnect, please 'Sign Up' below! Otherwise, try re-entering your details.",
        });
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format. Please check your email address.');
        toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please enter a valid email address.' });
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection and try again.');
        toast({ variant: 'destructive', title: 'Network Error', description: 'Could not connect. Check internet.' });
      } else {
        setError('An unexpected error occurred. Please try again.');
        toast({ variant: 'destructive', title: 'Login Error', description: err.message || 'An unexpected error occurred.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoogleSignIn = () => {
    toast({ title: "Coming Soon!", description: "Google Sign-In will be available soon." });
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address to reset your password.');
      toast({ title: "Email Required", description: "Enter your email to reset password.", variant: "default" });
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await resetUserPassword(email); // resetUserPassword is from firebase.ts
      toast({ title: "Password Reset Email Sent", description: `If an account exists for ${email}, a password reset link has been sent.` });
    } catch (err: any) {
      console.error("Error sending password reset email:", err);
      if (err.code === 'auth/invalid-email') {
        setError('Invalid email format. Please check your email address.');
        toast({ variant: 'destructive', title: 'Invalid Email', description: 'The email address is not valid.' });
      } else if (err.code === 'auth/user-not-found') {
         setError('No user found with this email address. Please sign up if you are new.');
         toast({ variant: 'destructive', title: 'User Not Found', description: 'No account found with this email. Sign up?' });
      } else {
        setError('Failed to send password reset email. Please try again.');
        toast({ variant: 'destructive', title: 'Error', description: 'Could not send password reset email.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPage) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-muted-foreground">Checking authentication...</p>
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
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Continue'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col items-center space-y-3">
          <Button variant="link" size="sm" onClick={handleForgotPassword} className="text-xs text-muted-foreground hover:text-primary">
            Forgot Password?
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
