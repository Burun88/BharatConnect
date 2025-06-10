
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
import type { LocalUserProfile } from '@/types';
// import { createOrUpdateUserFullProfile } from '@/services/profileService'; // Firebase removed

export default function VerifyPhonePage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);

  useEffect(() => {
    // Simplified check as Firebase auth is removed
    if (userProfileLs?.onboardingComplete) {
      router.replace('/');
    } else if (!userProfileLs?.uid) {
       console.warn("[VerifyPhonePage] No UID in LS. Redirecting to login/profile setup.");
       router.replace(userProfileLs?.displayName ? '/profile-setup' : '/login');
    }
  }, [router, userProfileLs]);


  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    
    setUserProfileLs(prev => ({ ...prev!, phoneNumber: `+91${phoneNumber}` } as LocalUserProfile)); 
    
    toast({
      title: 'OTP Sent (Simulated)',
      description: `An OTP has been sent to +91${phoneNumber}. Please enter it on the next screen. (Firebase removed)`,
    });
    router.push('/verify-otp'); 
  };

  const handleSkip = async () => {
    toast({ title: "Skipped", description: "Phone verification skipped."});
    if (userProfileLs?.uid && userProfileLs?.email && userProfileLs?.displayName) {
      try {
        // Mock saving profile as Firebase is removed
        console.log("[VerifyPhonePage] Skipping phone, marking onboarding complete (mock).");
        setUserProfileLs(prev => ({ ...prev!, onboardingComplete: true, phoneNumber: null } as LocalUserProfile));
        router.push('/');
      } catch (saveError: any) {
         console.error("Error during mock profile save after skipping phone verification:", saveError);
         setError("Failed to save profile (mock). Please try again or contact support.");
         toast({variant: "destructive", title: "Profile Save Failed (Mock)", description: saveError.message});
      }
    } else {
      console.warn("[VerifyPhonePage] Critical profile info missing when skipping. Redirecting to profile setup.");
      router.push('/profile-setup'); 
    }
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
            Adding your phone helps secure your account and find friends. (Optional)
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
            <Button type="button" variant="link" onClick={handleSkip} className="text-muted-foreground">
              Skip for Now
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
