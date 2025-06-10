
"use client";

import { useState, type FormEvent, useEffect, useRef, type ChangeEvent, type KeyboardEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquareLock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';
// import { createOrUpdateUserFullProfile } from '@/services/profileService'; // Firebase removed

const OTP_LENGTH = 6;

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const phoneToVerify = useMemo(() => userProfileLs?.phoneNumber || 'your phone', [userProfileLs]);

  useEffect(() => {
    // Simplified check as Firebase auth is removed
    if (userProfileLs?.onboardingComplete) {
      router.replace('/'); 
    } else if (!userProfileLs?.uid || !userProfileLs.phoneNumber) {
       console.warn("[VerifyOTPPage] Mismatch or missing UID/phone in LS. Redirecting.");
       router.replace(userProfileLs?.uid ? '/profile-setup' : '/login');
    }
  }, [router, userProfileLs]);

  useEffect(() => {
    if (inputRefs.current[0] && userProfileLs?.phoneNumber) {
        inputRefs.current[0]?.focus();
    }
  }, [userProfileLs?.phoneNumber]);

  const handleChange = (elementIndex: number, event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (isNaN(Number(value))) return; 

    const newOtp = [...otp];
    newOtp[elementIndex] = value.slice(-1); 
    setOtp(newOtp);

    if (value && elementIndex < OTP_LENGTH - 1) {
      inputRefs.current[elementIndex + 1]?.focus();
    }
  };

  const handleKeyDown = (elementIndex: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[elementIndex] && elementIndex > 0) {
      inputRefs.current[elementIndex - 1]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const enteredOtp = otp.join('');

    if (enteredOtp.length !== OTP_LENGTH) {
      setError(`Please enter a ${OTP_LENGTH}-digit OTP.`);
      return;
    }
    
    // Mock OTP verification
    if (enteredOtp === '123456') { 
      toast({
        title: 'Phone Verified! (Mocked)',
        description: 'Your phone number has been successfully verified (locally).',
      });

      const updatedProfileData = { 
        ...userProfileLs, 
        // phoneVerified: true, // Example field if you add it
        onboardingComplete: true // Final step
      };
      
      setUserProfileLs(updatedProfileData as LocalUserProfile);

      if (userProfileLs?.uid && userProfileLs.email && userProfileLs.displayName) {
        try {
          // Mock saving profile
          console.log("[VerifyOTPPage] Marking onboarding complete (mock).");
          toast({
            title: `Welcome, ${userProfileLs.displayName}! (Mocked)`,
            description: "Your BharatConnect account is fully set up (locally).",
          });
          router.push('/'); 
        } catch (saveError: any) {
          console.error("Error during mock profile save after OTP verification:", saveError);
          setError("Failed to save profile (mock). Please try again or contact support.");
          toast({variant: "destructive", title: "Profile Save Failed (Mock)", description: saveError.message});
        }
      } else {
        setError("Critical user information missing. Cannot complete profile setup.");
        toast({variant: "destructive", title: "Setup Error", description: "Missing essential profile data."});
        router.push('/profile-setup'); 
      }
    } else {
      setError('Invalid OTP. Please try again.');
      setOtp(new Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResendOtp = () => {
    toast({
      title: 'OTP Resent (Simulated)',
      description: `A new OTP would be resent to ${phoneToVerify}. (Firebase removed)`,
    });
    setOtp(new Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <MessageSquareLock className="w-16 h-16 text-gradient-primary-accent" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-gradient-primary-accent">
            Enter OTP
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            An OTP has been sent to {phoneToVerify}.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="otp-0">One-Time Password</Label>
              <div className="flex justify-center space-x-2">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    id={`otp-${index}`}
                    type="tel" 
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    ref={el => inputRefs.current[index] = el}
                    className="w-10 h-12 text-center text-xl font-mono"
                    aria-label={`OTP digit ${index + 1}`}
                  />
                ))}
              </div>
              {error && <p className="text-sm text-destructive text-center pt-2">{error}</p>}
            </div>
            <div className="text-center">
              <Button type="button" variant="link" onClick={handleResendOtp} className="text-primary">
                Resend OTP
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-2">
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity">
              Verify OTP & Complete Setup
            </Button>
             <Button type="button" variant="outline" onClick={() => router.back()} className="w-full">
              Back
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
