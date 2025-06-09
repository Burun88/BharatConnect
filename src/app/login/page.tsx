
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
import { getUserFullProfile, getInstaBharatIdentity, type BharatConnectUser, type InstaBharatIdentity } from '@/services/profileService';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [, setOnboardingCompleteLs] = useLocalStorage('onboardingComplete', false);
  const initialProfile = useMemo(() => ({ name: '', phone: '', email: '', photoURL: '', username: '' }), []);
  const [, setUserProfileLs] = useLocalStorage('userProfile', initialProfile);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.uid && !isLoading) { // Ensure not to interfere if a login submission is in progress and UID exists
        console.log(`[Login Page] onAuthStateChanged: User detected (UID: ${user.uid}). Checking profile status.`);
        getUserFullProfile(user.uid)
          .then(bcProfile => { // bcProfile is BharatConnectUser | null
            if (bcProfile && bcProfile.onboardingComplete) {
              console.log(`[Login Page] onAuthStateChanged: BharatConnect profile found and onboarding complete for UID: ${user.uid}. Redirecting to home.`);
              setUserProfileLs({ name: bcProfile.name, phone: bcProfile.phone || '', email: bcProfile.email, photoURL: bcProfile.photoURL || '', username: bcProfile.username || '' });
              setOnboardingCompleteLs(true);
              router.replace('/');
              return null; // Stop further processing in this chain
            }
            console.log(`[Login Page] onAuthStateChanged: BharatConnect profile not found or onboarding incomplete for UID: ${user.uid}. Fetching InstaBharat identity.`);
            // Not fully onboarded or no BC profile, proceed to fetch InstaBharat data for profile-setup
            return getInstaBharatIdentity(user.uid).then(instaProfile => ({ bcProfile, instaProfile })); // instaProfile is InstaBharatIdentity | null
          })
          .then(profiles => {
            if (!profiles) return; // Already redirected or initial check failed gracefully

            const { bcProfile, instaProfile } = profiles;
            console.log(`[Login Page] onAuthStateChanged: InstaBharat Identity for UID ${user.uid}:`, instaProfile);
            console.log(`[Login Page] onAuthStateChanged: Existing BC Profile (if any) for UID ${user.uid}:`, bcProfile);

            setUserProfileLs(prev => ({
              ...prev,
              email: user.email || '',
              name: instaProfile?.name || bcProfile?.name || '',
              photoURL: instaProfile?.profileImageUrl || bcProfile?.photoURL || '', // Use profileImageUrl from instaProfile
              username: instaProfile?.username || bcProfile?.username || ''
            }));
            setOnboardingCompleteLs(false);

            const queryParams = new URLSearchParams();
            if (user.email) queryParams.append('email', user.email);
            
            const namePrefill = instaProfile?.name || bcProfile?.name;
            const photoPrefill = instaProfile?.profileImageUrl || (bcProfile as BharatConnectUser | null)?.photoURL; // Use profileImageUrl
            const usernamePrefill = instaProfile?.username;

            console.log(`[Login Page] onAuthStateChanged: Prefill data for setup: Name: '${namePrefill}', Photo: '${photoPrefill}', Username: '${usernamePrefill}'`);

            if (namePrefill) queryParams.append('name_prefill', namePrefill);
            if (photoPrefill) queryParams.append('photo_prefill', photoPrefill);
            if (usernamePrefill) queryParams.append('username_prefill', usernamePrefill);
            
            console.log(`[Login Page] onAuthStateChanged: Redirecting to profile-setup for UID: ${user.uid} with query: ${queryParams.toString()}`);
            router.replace(`/profile-setup?${queryParams.toString()}`);
          })
          .catch(err => {
            console.error(`[Login Page] onAuthStateChanged: Error during auth state check for UID ${user.uid}:`, err);
            setError("Could not verify your profile status. Please try logging in.");
          });
      } else if (!user && !isLoading) {
        console.log("[Login Page] onAuthStateChanged: No user detected.");
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

      if (!user || !user.uid) {
        console.error("[Login Page] handleSubmit: Login successful but user object or UID is missing.");
        setError("Login failed: User session is invalid. Please try again.");
        toast({ variant: 'destructive', title: 'Login Failed', description: 'User session is invalid after login.' });
        setIsLoading(false);
        return;
      }
      
      console.log(`[Login Page] handleSubmit: Login successful for UID: ${user.uid}. Checking profile status.`);

      const bcProfile = await getUserFullProfile(user.uid) // Use getUserFullProfile
        .catch(fetchError => {
          console.error(`[Login Page] handleSubmit: Failed to fetch BharatConnect profile for UID ${user.uid}:`, fetchError);
          toast({
            variant: 'destructive',
            title: 'Profile Check Failed',
            description: 'Could not retrieve your profile information. Please try again.',
          });
          throw new Error("Could not retrieve your profile."); // Re-throw to be caught by outer try-catch
        });

      if (bcProfile && bcProfile.onboardingComplete) {
        console.log(`[Login Page] handleSubmit: BharatConnect profile found and onboarding complete for UID: ${user.uid}. Redirecting to home.`);
        setUserProfileLs({ name: bcProfile.name, phone: bcProfile.phone || '', email: bcProfile.email, photoURL: bcProfile.photoURL || '', username: bcProfile.username || '' });
        setOnboardingCompleteLs(true);
        toast({
          title: 'Login Successful!',
          description: 'Welcome back to BharatConnect!',
        });
        router.push('/');
      } else {
        console.log(`[Login Page] handleSubmit: BharatConnect profile not found or onboarding incomplete for UID: ${user.uid}. Fetching InstaBharat identity.`);
        const instaProfile = await getInstaBharatIdentity(user.uid) // Use getInstaBharatIdentity
          .catch(fetchError => {
            console.warn(`[Login Page] handleSubmit: Failed to fetch InstaBharat profile for UID ${user.uid} (non-critical):`, fetchError);
            return null; // Proceed without prefill if InstaBharat fetch fails
          });
        
        console.log(`[Login Page] handleSubmit: InstaBharat Identity for UID ${user.uid}:`, instaProfile);

        setUserProfileLs(prev => ({
            ...prev,
            email: user.email || '',
            name: instaProfile?.name || bcProfile?.name || '',
            photoURL: instaProfile?.profileImageUrl || bcProfile?.photoURL || '', // Use profileImageUrl from instaProfile
            username: instaProfile?.username || bcProfile?.username || ''
        }));
        setOnboardingCompleteLs(false);

        const queryParams = new URLSearchParams();
        if (user.email) queryParams.append('email', user.email);
        
        const namePrefill = instaProfile?.name || bcProfile?.name;
        const photoPrefill = instaProfile?.profileImageUrl || (bcProfile as BharatConnectUser | null)?.photoURL; // Use profileImageUrl
        const usernamePrefill = instaProfile?.username;

        console.log(`[Login Page] handleSubmit: Prefill data for setup: Name: '${namePrefill}', Photo: '${photoPrefill}', Username: '${usernamePrefill}'`);

        if (namePrefill) queryParams.append('name_prefill', namePrefill);
        if (photoPrefill) queryParams.append('photo_prefill', photoPrefill);
        if (usernamePrefill) queryParams.append('username_prefill', usernamePrefill);
        
        toast({
          title: 'Login Successful!',
          description: 'Please complete your BharatConnect profile.',
        });
        console.log(`[Login Page] handleSubmit: Redirecting to profile-setup for UID: ${user.uid} with query: ${queryParams.toString()}`);
        router.push(`/profile-setup?${queryParams.toString()}`);
      }
    } catch (err: any) {
      console.error("[Login Page] handleSubmit: Login error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(err.message || 'Failed to login. Please try again.');
      }
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
