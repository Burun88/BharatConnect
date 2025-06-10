
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
import type { LocalUserProfile } from '@/types';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  const [userProfileGlobal] = useLocalStorage<LocalUserProfile | null>('userProfile', null);

  useEffect(() => {
    // Simplified: If user profile exists and onboarding is complete, redirect.
    if (userProfileGlobal?.uid && userProfileGlobal?.onboardingComplete) {
      router.replace('/');
    }
  }, [router, userProfileGlobal]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    console.log("[Signup Page] Attempting signup (Firebase removed, this is a mock action).");
    // Mocking signup success as Firebase is removed
    setTimeout(() => {
      const mockUserId = `user_${Date.now()}`;
      const mockUserEmail = email;
      
      console.log(`[Signup Page] Mock account created for UID: ${mockUserId}. Email: ${mockUserEmail}. Proceeding to profile setup.`);
      
      setUserProfileLs({ 
        uid: mockUserId, 
        email: mockUserEmail,
        onboardingComplete: false, 
      });
      
      console.log(`[Signup Page] Redirecting to profile-setup for UID: ${mockUserId}.`);
      router.push('/profile-setup'); 
      setIsLoading(false);
      toast({
        title: 'Signup Attempted (Mock)',
        description: 'Firebase is removed. Simulating signup and redirecting to profile setup.',
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="large" />
          </div>
          <CardDescription className="text-muted-foreground pt-2">
            Join BharatConnect to connect with India!
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-describedby="signup-error"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="•••••••• (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-describedby="signup-error"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                aria-describedby="signup-error"
              />
            </div>
            {error && <p id="signup-error" className="text-sm text-destructive text-center">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col space-y-3">
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Sign Up & Continue'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
