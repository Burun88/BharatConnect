
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
import { auth } from '@/lib/firebase'; // Import auth
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged

const OTP_LENGTH = 6;

// This page might be deprecated or used for a secondary phone verification if needed.
// For now, it will redirect if user is logged in via email/password.

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const initialProfile = useMemo(() => ({ phone: '', name: '', email: '' }), []);
  const [userProfileLs] = useLocalStorage('userProfile', initialProfile);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [onboardingCompleteLs] = useLocalStorage('onboardingComplete', false);

  useEffect(() => {
     const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is logged in (likely via email/pass), this flow is not primary.
        if (onboardingCompleteLs) {
          router.replace('/');
        } else {
          router.replace('/profile-setup');
        }
      }
    });
    return () => unsubscribe();
  }, [router, onboardingCompleteLs]);

  useEffect(() => {
    if (!auth.currentUser) { // Only focus if not already logged in and redirected
        inputRefs.current[0]?.focus();
    }
  }, []);

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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const enteredOtp = otp.join('');

    if (enteredOtp.length !== OTP_LENGTH) {
      setError(`Please enter a ${OTP_LENGTH}-digit OTP.`);
      return;
    }
    
    // Simulate OTP verification 
     toast({
        title: "Phone Auth Inactive",
        description: "This OTP flow is currently not primary. Please use email/password signup or login.",
        variant: "default"
    });
    // if (enteredOtp === '123456') { // Example OTP
    //   toast({
    //     title: 'Phone Verified!',
    //     description: 'Your phone number has been successfully verified.',
    //   });
    //   router.push('/profile-setup'); // This would be the next step
    // } else {
    //   setError('Invalid OTP. Please try again.');
    // }
  };

  const handleResendOtp = () => {
    toast({
      title: 'OTP Resent (Simulated)',
      description: `This flow is currently not primary. An OTP would be resent to ${userProfileLs.phone}.`,
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
            Enter OTP (Legacy)
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Phone verification is not the primary flow. An OTP would have been sent to {userProfileLs.phone || 'your phone'}.
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
                    disabled // Disabled as it's not primary flow
                  />
                ))}
              </div>
              {error && <p className="text-sm text-destructive text-center pt-2">{error}</p>}
            </div>
            <div className="text-center">
              <Button type="button" variant="link" onClick={handleResendOtp} className="text-primary" disabled>
                Resend OTP (Disabled)
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled>
              Verify OTP (Disabled)
            </Button>
          </CardFooter>
        </form>
      </Card>
      <Button variant="link" className="mt-4 text-sm text-muted-foreground" onClick={() => router.push('/welcome')}>
        Back to Welcome
      </Button>
    </div>
  );
}
