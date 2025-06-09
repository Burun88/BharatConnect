
"use client";

import { useState, type FormEvent, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { auth } from '@/lib/firebase'; // Import auth
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged

// This page might be deprecated or used for a secondary phone verification if needed.
// For now, it will redirect if user is logged in via email/password.

export default function VerifyPhonePage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const initialProfile = useMemo(() => ({ phone: '', name: '', email: '' }), []);
  const [, setUserProfileLs] = useLocalStorage('userProfile', initialProfile);
  const [onboardingCompleteLs] = useLocalStorage('onboardingComplete', false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is logged in (likely via email/pass), this flow is not primary.
        // Redirect to home if onboarded, or profile-setup if not.
        if (onboardingCompleteLs) {
          router.replace('/');
        } else {
          // If user exists but onboarding not complete via LS,
          // they should ideally go to profile-setup.
          // The new flow handles this after login/signup.
          router.replace('/profile-setup');
        }
      }
    });
    return () => unsubscribe();
  }, [router, onboardingCompleteLs]);


  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    
    // This logic would need to be integrated with Firebase Phone Auth if re-enabled
    setUserProfileLs(prev => ({ ...prev, phone: `+91${phoneNumber}` }));
    toast({
      title: 'OTP Sent (Simulated)',
      description: `This flow is currently not primary. An OTP would be sent to +91${phoneNumber}.`,
    });
    // router.push('/verify-otp'); // This would be the next step if phone auth was active
    toast({
        title: "Phone Auth Inactive",
        description: "Phone authentication is not the primary flow. Please use email/password signup or login.",
        variant: "default"
    })
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Phone className="w-16 h-16 text-gradient-primary-accent" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-gradient-primary-accent">
            Verify Your Phone (Legacy)
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            This phone verification flow is currently not the primary onboarding method. Please use Email/Password signup.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-md border bg-muted text-muted-foreground">+91</span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  maxLength={10}
                  className="flex-1"
                  aria-describedby="phone-error"
                  disabled // Disabled as it's not primary flow
                />
              </div>
              {error && <p id="phone-error" className="text-sm text-destructive">{error}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground  hover:opacity-90 transition-opacity" disabled>
              Send OTP (Disabled)
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
