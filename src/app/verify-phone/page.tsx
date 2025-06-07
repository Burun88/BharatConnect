
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

export default function VerifyPhonePage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const initialProfile = useMemo(() => ({ phone: '', name: '' }), []);
  const [, setUserProfile] = useLocalStorage('userProfile', initialProfile);
  const [onboardingComplete, ] = useLocalStorage('onboardingComplete', false);

  useEffect(() => {
    if (onboardingComplete) {
      router.replace('/');
    }
  }, [onboardingComplete, router]);


  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    
    setUserProfile(prev => ({ ...prev, phone: `+91${phoneNumber}` }));
    toast({
      title: 'OTP Sent',
      description: `An OTP has been sent to +91${phoneNumber}. (Simulated)`,
    });
    router.push('/verify-otp');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Phone className="w-16 h-16 text-gradient-primary-accent" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-gradient-primary-accent">
            Verify Your Phone
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            We'll send you an OTP to confirm your number.
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
                />
              </div>
              {error && <p id="phone-error" className="text-sm text-destructive">{error}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground  hover:opacity-90 transition-opacity">
              Send OTP
            </Button>
          </CardFooter>
        </form>
      </Card>
       <Button variant="link" className="mt-4 text-sm text-muted-foreground" onClick={() => router.back()}>
        Back
      </Button>
    </div>
  );
}
