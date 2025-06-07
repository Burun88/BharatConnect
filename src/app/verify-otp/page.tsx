
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

const OTP_LENGTH = 6;

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const initialProfile = useMemo(() => ({ phone: '', name: '' }), []);
  const [userProfile] = useLocalStorage('userProfile', initialProfile);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [onboardingComplete, ] = useLocalStorage('onboardingComplete', false);

  useEffect(() => {
    if (onboardingComplete) {
      router.replace('/');
    }
  }, [onboardingComplete, router]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (elementIndex: number, event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (isNaN(Number(value))) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[elementIndex] = value.slice(-1); // Allow only one digit
    setOtp(newOtp);

    // Move to next input if a digit is entered
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
    
    // Simulate OTP verification (e.g., check if OTP is '123456')
    if (enteredOtp === '123456') {
      toast({
        title: 'Phone Verified!',
        description: 'Your phone number has been successfully verified.',
      });
      router.push('/profile-setup');
    } else {
      setError('Invalid OTP. Please try again.');
      toast({
        title: 'Verification Failed',
        description: 'The OTP you entered is incorrect. (Hint: try 123456)',
        variant: 'destructive',
      });
    }
  };

  const handleResendOtp = () => {
    // Simulate resending OTP
    toast({
      title: 'OTP Resent',
      description: `A new OTP has been sent to ${userProfile.phone}. (Simulated)`,
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
            An OTP has been sent to {userProfile.phone || 'your phone'}. (Hint: 123456)
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
          <CardFooter>
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity">
              Verify OTP
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
