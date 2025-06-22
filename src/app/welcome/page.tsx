
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';
import type { AuthStep } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

export default function WelcomePage() {
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();
  const { isAuthLoading } = useAuth();
  const [, setAuthStepLs] = useLocalStorage<AuthStep>('bharatconnect-auth-step', 'initial_loading');

  // useEffect for redirection was removed. AuthContext now handles this globally.

  const handleAgreeChange = (checked: boolean | 'indeterminate') => {
    setAgreed(checked === true);
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-muted-foreground text-center">Loading Welcome...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-primary">
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
            onClick={() => {
              if (agreed) {
                setAuthStepLs('login'); // Set auth step to 'login'
                router.push('/login');
              }
            }}
          >
            Agree and Continue
          </Button>
        </CardFooter>
      </Card>
      <p className="mt-8 text-xs text-muted-foreground">
        Built with ❤️ in India
      </p>
    </div>
  );
}
