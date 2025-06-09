
"use client";

import { useState, type FormEvent, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/shared/Logo';
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
  const initialProfile = useMemo(() => ({ name: '', phone: '', email: '' }), []);
  const [, setUserProfileLs] = useLocalStorage('userProfile', initialProfile);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !isLoading) { // Ensure not to interfere if a login submission is in progress
        getBharatConnectProfile(user.uid)
          .then(bcProfile => {
            if (bcProfile && bcProfile.onboardingComplete) {
              setUserProfileLs({ name: bcProfile.name, phone: bcProfile.phone || '', email: bcProfile.email });
              setOnboardingCompleteLs(true);
              router.replace('/');
              return null; // Stop further processing in this chain
            }
            // Not fully onboarded or no BC profile, proceed to fetch InstaBharat data for profile-setup
            return getInstaBharatProfileData(user.uid).then(instaProfile => ({ bcProfile, instaProfile }));
          })
          .then(profiles => {
            if (!profiles) return; // Already redirected or initial check failed gracefully

            const { bcProfile, instaProfile } = profiles;
            setUserProfileLs(prev => ({ ...prev, email: user.email || '', name: instaProfile?.name || bcProfile?.name || '' }));
            setOnboardingCompleteLs(false);

            const queryParams = new URLSearchParams();
            if (user.email) queryParams.append('email', user.email);
            
            const namePrefill = instaProfile?.name || bcProfile?.name;
            const photoPrefill = instaProfile?.photoURL || (bcProfile as BharatConnectProfile | null)?.photoURL;
            const usernamePrefill = instaProfile?.username;


            if (namePrefill) queryParams.append('name_prefill', namePrefill);
            if (photoPrefill) queryParams.append('photo_prefill', photoPrefill);
            if (usernamePrefill) queryParams.append('username_prefill', usernamePrefill);
            
            router.replace(`/profile-setup?${queryParams.toString()}`);
          })
          .catch(err => {
            console.error("Error during auth state check on login page:", err);
            // If fetching profiles fails, user stays on login page.
            // They can attempt to login manually.
            setError("Could not verify your profile status. Please try logging in.");
          });
      }
    });
    return () => unsubscribe();
  }, [router, isLoading, setUserProfileLs, setOnboardingCompleteLs]);

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
        const bcProfile = await getBharatConnectProfile(user.uid)
          .catch(fetchError => {
            console.error("Failed to fetch BharatConnect profile during login:", fetchError);
            toast({
              variant: 'destructive',
              title: 'Profile Check Failed',
              description: 'Could not retrieve your profile information. Please try again.',
            });
            throw new Error("Could not retrieve your profile."); // Re-throw to be caught by outer try-catch
          });

        if (bcProfile && bcProfile.onboardingComplete) {
          setUserProfileLs({ name: bcProfile.name, phone: bcProfile.phone || '', email: bcProfile.email });
          setOnboardingCompleteLs(true);
          toast({
            title: 'Login Successful!',
            description: 'Welcome back to BharatConnect!',
          });
          router.push('/');
        } else {
          const instaProfile = await getInstaBharatProfileData(user.uid)
            .catch(fetchError => {
              console.warn("Failed to fetch InstaBharat profile during login (non-critical):", fetchError);
              return null; // Proceed without prefill if InstaBharat fetch fails
            });
          
          setUserProfileLs(prev => ({ ...prev, email: user.email || '', name: instaProfile?.name || bcProfile?.name || '' }));
          setOnboardingCompleteLs(false);

          const queryParams = new URLSearchParams();
          if (user.email) queryParams.append('email', user.email);
          
          const namePrefill = instaProfile?.name || bcProfile?.name;
          const photoPrefill = instaProfile?.photoURL || (bcProfile as BharatConnectProfile | null)?.photoURL;
          const usernamePrefill = instaProfile?.username;

          if (namePrefill) queryParams.append('name_prefill', namePrefill);
          if (photoPrefill) queryParams.append('photo_prefill', photoPrefill);
          if (usernamePrefill) queryParams.append('username_prefill', usernamePrefill);
          
          toast({
            title: 'Login Successful!',
            description: 'Please complete your BharatConnect profile.',
          });
          router.push(`/profile-setup?${queryParams.toString()}`);
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(err.message || 'Failed to login. Please try again.');
      }
      // Toast for auth errors is already here, no need to duplicate if re-thrown from profile fetch
      if (!toast.toasts.find(t => t.title === 'Profile Check Failed')) { // Avoid duplicate toasts
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: err.message || 'Invalid credentials or an unexpected error occurred.',
          });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="large" />
          </div>
          <CardDescription className="text-muted-foreground pt-2">
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
                aria-describedby="login-error"
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
                aria-describedby="login-error"
              />
            </div>
            {error && <p id="login-error" className="text-sm text-destructive">{error}</p>}
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
