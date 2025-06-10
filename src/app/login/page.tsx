
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
import type { LocalUserProfile, BharatConnectFirestoreUser } from '@/types'; // Assuming BharatConnectFirestoreUser might still be used for structure by LocalUserProfile

export default function LoginPageHub() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  
  useEffect(() => {
    // Simplified: If user profile exists and onboarding is complete, redirect.
    // This no longer checks live auth state.
    if (userProfileLs?.uid && userProfileLs?.onboardingComplete) {
      console.log(`[Login Hub] User ${userProfileLs.uid} from LS appears onboarded. Redirecting to /`);
      router.replace('/');
    }
  }, [router, userProfileLs]);

  const handleLoginSuccess = (userId: string, profileEmail: string, profileData?: Partial<BharatConnectFirestoreUser>) => {
    const onboardingComplete = !!profileData?.onboardingComplete;
    if (onboardingComplete) {
      console.log(`[Login Hub] Mock login success for ${userId}. Redirecting to home.`);
      setUserProfileLs({ 
        uid: userId,
        email: profileEmail,
        displayName: profileData?.displayName,
        photoURL: profileData?.photoURL,
        phoneNumber: profileData?.phoneNumber,
        onboardingComplete: true,
      });
      router.replace('/');
    } else {
      console.log(`[Login Hub] Mock login success for ${userId}, but onboarding incomplete. Redirecting to profile-setup.`);
      setUserProfileLs({ 
        uid: userId,
        email: profileEmail,
        displayName: profileData?.displayName || undefined, 
        photoURL: profileData?.photoURL || undefined,
        onboardingComplete: false, 
      });
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

    console.log("[Login Hub] Attempting login (Firebase removed, this is a mock action).");
    // Mocking login success for demonstration as Firebase is removed
    // In a real scenario, this would call an auth provider.
    setTimeout(() => {
      // Simulate fetching a profile or proceeding based on email/pass.
      // For now, let's assume login is successful and user needs onboarding.
      const mockUserId = `user_${Date.now()}`;
      handleLoginSuccess(mockUserId, email, { onboardingComplete: false, displayName: "Demo User" });
      setIsLoading(false);
      toast({
        title: 'Login Attempted (Mock)',
        description: 'Firebase is removed. Simulating login process.',
      });
    }, 1000);
  };
  
  const handleGoogleSignIn = () => {
    console.log("Google Sign-In clicked - Firebase removed");
    toast({ title: "Coming Soon!", description: "Google Sign-In will be available soon (Firebase removed)." });
  };

  const handleForgotPassword = () => {
    console.log("Forgot Password clicked - Firebase removed");
    if (!email.trim()) {
      toast({ title: "Email Required", description: "Please enter your email address to reset password.", variant: "default" });
      return;
    }
    toast({ title: "Password Reset (Mock)", description: `If ${email} were registered, a reset link would be sent.` });
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
