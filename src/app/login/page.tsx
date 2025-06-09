
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/shared/Logo'; // Import the Logo component
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

        const bcProfile = await getBharatConnectProfile(user.uid);

        if (bcProfile && bcProfile.onboardingComplete) {
          setUserProfileLs({ name: bcProfile.name, phone: bcProfile.phone || '', email: bcProfile.email });
          setOnboardingCompleteLs(true);
          router.push('/');
        } else {
          const instaProfile = await getInstaBharatProfileData(user.uid);
          
          setUserProfileLs(prev => ({ ...prev, email: user.email || '', name: instaProfile?.name || bcProfile?.name || '' }));
          setOnboardingCompleteLs(false);

          const queryParams = new URLSearchParams();
          if (user.email) queryParams.append('email', user.email);
          
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
          <div className="flex justify-center mb-6"> {/* Increased bottom margin */}
            <Logo size="large" /> {/* Using the Logo component */}
          </div>
          {/* Removed CardTitle as Logo serves this purpose */}
          <CardDescription className="text-muted-foreground pt-2"> {/* Added top padding */}
            Sign in to continue to your BharatConnect account.
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
