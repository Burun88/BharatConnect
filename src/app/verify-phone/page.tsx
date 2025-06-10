
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { auth } from '@/lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import type { LocalUserProfile } from '@/types';

// This page is part of the NEW optional phone verification flow.
// It should be triggered from a "Add Phone Number" screen.
// For now, it's a standalone placeholder and might redirect if user is already past this.

export default function VerifyPhonePage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const initialProfile = {} as LocalUserProfile;
  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', initialProfile);
  const [onboardingCompleteLs] = useLocalStorage('onboardingComplete', false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (onboardingCompleteLs && userProfileLs?.uid === user.uid) {
          // If fully onboarded, no need to be here.
          router.replace('/');
        } else if (!userProfileLs?.uid || userProfileLs.uid !== user.uid) {
          // If LS doesn't match current user, or no UID in LS, they shouldn't be here without context
           console.warn("[VerifyPhonePage] Mismatch between auth user and LS profile or no LS UID. Redirecting to login.");
           // router.replace('/login'); // Or perhaps profile-setup if basic auth done.
        }
        // If onboarding not complete, but UID matches, allow them to stay for phone verification.
      } else {
        // No auth user, definitely shouldn't be here.
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, onboardingCompleteLs, userProfileLs]);


  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    // Basic 10-digit validation for India, can be expanded.
    if (!/^\d{10}$/.test(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    
    // Store phone number in LS temporarily for OTP step
    setUserProfileLs(prev => ({ ...prev!, phoneNumber: `+91${phoneNumber}` })); // Assumes +91 for India
    
    toast({
      title: 'OTP Sent (Simulated)',
      description: `An OTP has been sent to +91${phoneNumber}. Please enter it on the next screen.`,
    });
    router.push('/verify-otp'); // Proceed to OTP verification
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Phone className="w-16 h-16 text-gradient-primary-accent" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-gradient-primary-accent">
            Verify Your Phone Number
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Adding your phone helps secure your account and find friends.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center space-x-2">
                <span className="p-2.5 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm">+91</span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  maxLength={10}
                  className="flex-1 rounded-l-none"
                  aria-describedby="phone-error"
                />
              </div>
              {error && <p id="phone-error" className="text-sm text-destructive">{error}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-3">
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground  hover:opacity-90 transition-opacity">
              Send OTP
            </Button>
            <Button type="button" variant="link" onClick={() => {
              // This "Skip" should lead to the next step after phone verification (e.g., Permissions, then Firestore save)
              // For now, if skipping, we might assume profile setup (name/pic) was done, and save with null phone.
              // This needs to integrate with the overall onboarding state.
              toast({ title: "Skipped", description: "Phone verification skipped."});
              // Potentially redirect to permissions page or directly save profile if that's the flow.
              // router.push('/permissions-setup'); // Example next step
              // For now, if skipping here means end of onboarding (if profile-setup was previous step):
              if (userProfileLs?.uid && userProfileLs?.email && userProfileLs?.displayName) {
                // Call createOrUpdateUserFullProfile with null phone and onboardingComplete: true
                // This logic would ideally be on a dedicated "phone setup" screen
                // For now, just go to home as if onboarding complete.
                setOnboardingCompleteLs(true); // Mark as complete even if phone skipped
                router.push('/');
              } else {
                router.push('/profile-setup'); // Fallback if essential profile info missing
              }
            }} className="text-muted-foreground">
              Skip for Now
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
