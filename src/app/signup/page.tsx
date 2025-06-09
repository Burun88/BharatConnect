
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getInstaBharatProfileData } from '@/services/profileService';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [, setOnboardingCompleteLs] = useLocalStorage('onboardingComplete', false); // For redirect logic
  const [userProfileLs, setUserProfileLs] = useLocalStorage('userProfile', { name: '', phone: '', email: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is somehow already logged in when reaching signup, redirect to profile setup or home.
        // This check might be more robust if we check a Firestore profile.
        if(userProfileLs.name && userProfileLs.email) { // Basic check if profile seems partially set
             router.replace('/');
        } else {
             router.replace('/profile-setup');
        }
      }
    });
    return () => unsubscribe();
  }, [router, userProfileLs]);

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

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user) {
        toast({
          title: 'Account Created!',
          description: 'Welcome to BharatConnect!',
        });

        // Fetch InstaBharat profile data
        const instaProfile = await getInstaBharatProfileData(user.uid);
        
        // Store email in localStorage userProfile for profile-setup prefill
        setUserProfileLs(prev => ({ ...prev, email: user.email || '' }));
        setOnboardingCompleteLs(false); // Ensure onboarding is marked as not complete

        // Navigate to profile setup, passing InstaBharat data if found
        const queryParams = new URLSearchParams();
        if (user.email) queryParams.append('email', user.email);
        if (instaProfile?.name) queryParams.append('name_prefill', instaProfile.name);
        if (instaProfile?.photoURL) queryParams.append('photo_prefill', instaProfile.photoURL);
        
        router.push(`/profile-setup?${queryParams.toString()}`);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login or use a different email.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <UserPlus className="w-16 h-16 text-gradient-primary-accent" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-gradient-primary-accent">
            Create Account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Join BharatConnect today!
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col space-y-3">
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
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
