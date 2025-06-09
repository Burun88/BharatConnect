
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { auth } from '@/lib/firebase'; // Import Firebase auth
import { onAuthStateChanged } from 'firebase/auth';

export default function WelcomePage() {
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();
  // We might not need this specific onboardingComplete from localStorage if we rely on Firebase profile
  const [onboardingCompleteLs, setOnboardingCompleteLs] = useLocalStorage('onboardingComplete', false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is logged in and onboarding was completed (from localStorage or ideally Firestore profile)
        // This logic might need to move to after login/signup to check Firestore profile
        if (onboardingCompleteLs) {
          router.replace('/');
        } else {
          // User is logged in but onboarding not marked complete in LS,
          // might need to check Firestore profile here or guide to profile-setup
          // For now, if LS says not complete, they stay on welcome or go to setup.
          // This could be refined once Firestore profile check is robust post-login.
           setCheckingAuth(false); // Allow page to render if onboarding not complete
        }
      } else {
        setCheckingAuth(false); // No user, allow page to render
      }
    });
    return () => unsubscribe();
  }, [router, onboardingCompleteLs]);

  const handleAgreeChange = (checked: boolean | 'indeterminate') => {
    setAgreed(checked === true);
  };

  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ShieldCheck className="w-16 h-16 text-gradient-primary-accent animate-pulse" />
            </div>
            <CardTitle className="text-3xl font-headline font-bold text-gradient-primary-accent">
              Welcome to BharatConnect
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Loading...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto animate-pulse"></div>
          </CardContent>
           <CardFooter className="flex-col space-y-2">
            <Button disabled className="w-full h-10 bg-muted animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/4 mx-auto animate-pulse"></div>
          </CardFooter>
        </Card>
      </div>
    );
  }


  // If already onboarded via localStorage (and user is logged in), redirect.
  // This might be redundant if onAuthStateChanged handles it, but acts as a quick check.
  if (auth.currentUser && onboardingCompleteLs) {
     router.replace('/');
     return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="w-16 h-16 text-gradient-primary-accent" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-gradient-primary-accent">
            Welcome to BharatConnect
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Connecting India, Securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-foreground/80">
            BharatConnect is a messaging app designed for seamless and secure communication. 
            By using our app, you agree to our Terms of Service and Privacy Policy.
          </p>
          <div className="items-top flex space-x-2">
            <Checkbox 
              id="terms" 
              checked={agreed} 
              onCheckedChange={handleAgreeChange} 
              aria-labelledby="terms-label"
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="terms"
                id="terms-label"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </Label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col space-y-2">
          <Button
            disabled={!agreed}
            className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity"
            onClick={() => agreed && router.push('/signup')}
          >
            Agree and Continue to Signup
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
      <p className="mt-8 text-xs text-muted-foreground">
        Built with ❤️ in India
      </p>
    </div>
  );
}
