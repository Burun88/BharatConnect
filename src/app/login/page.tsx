
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getBharatConnectProfile, getInstaBharatProfileData, type BharatConnectProfile } from '@/services/profileService';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [, setOnboardingCompleteLs] = useLocalStorage('onboardingComplete', false);
  const [userProfileLs, setUserProfileLs] = useLocalStorage('userProfile', { name: '', phone: '', email: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is already logged in and profile seems set, redirect.
        // This logic needs to be robust with Firestore profile check.
         getBharatConnectProfile(user.uid).then(profile => {
           if (profile && profile.onboardingComplete) {
             router.replace('/');
           }
         });
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user) {
        toast({
          title: 'Login Successful!',
          description: 'Welcome back to BharatConnect!',
        });

        // Check for existing BharatConnect profile
        const bcProfile = await getBharatConnectProfile(user.uid);

        if (bcProfile && bcProfile.onboardingComplete) {
          // User has a complete BharatConnect profile, update localStorage and redirect to home
          setUserProfileLs({ name: bcProfile.name, phone: bcProfile.phone || '', email: bcProfile.email });
          setOnboardingCompleteLs(true);
          router.push('/');
        } else {
          // No complete BharatConnect profile, fetch InstaBharat data and go to profile setup
          const instaProfile = await getInstaBharatProfileData(user.uid);
          
          setUserProfileLs(prev => ({ ...prev, email: user.email || '', name: instaProfile?.name || bcProfile?.name || '' }));
          setOnboardingCompleteLs(false);

          const queryParams = new URLSearchParams();
          if (user.email) queryParams.append('email', user.email);
          
          // Prefer InstaBharat name/photo if available, fallback to incomplete BC profile
          const namePrefill = instaProfile?.name || bcProfile?.name;
          const photoPrefill = instaProfile?.photoURL || bcProfile?.photoURL;

          if (namePrefill) queryParams.append('name_prefill', namePrefill);
          if (photoPrefill) queryParams.append('photo_prefill', photoPrefill);
          
          router.push(`/profile-setup?${queryParams.toString()}`);
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(err.message || 'Failed to login. Please try again.');
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: err.message || 'Invalid credentials or an unexpected error occurred.',
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
            <LogIn className="w-16 h-16 text-gradient-primary-accent" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-gradient-primary-accent">
            Login to BharatConnect
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Welcome back!
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
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col space-y-3">
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={isLoading}>
              {isLoading ? 'Logging In...' : 'Login'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                Sign Up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
