
"use client";

import { useState, type FormEvent, type ChangeEvent, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle2, Camera, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import Logo from '@/components/shared/Logo';
import type { LocalUserProfile } from '@/types';
import { auth } from '@/lib/firebase'; // Import auth for direct access if needed, though LS is primary

function ProfileSetupContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);

  // Initialize component state
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);

  const [authUid, setAuthUid] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string>('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);


  useEffect(() => {
    const currentLocalProfile = userProfileLs;

    if (currentLocalProfile?.uid) {
      setAuthUid(currentLocalProfile.uid);
      setAuthEmail(currentLocalProfile.email || '');

      // If onboarding is complete, redirect to home.
      if (currentLocalProfile.onboardingComplete === true) {
        console.log("[ProfileSetupPage] User from LS already onboarded. Redirecting to home.");
        router.replace('/');
        return; 
      }

      // Pre-fill form fields only if they haven't been touched by the user yet (i.e., component state is still initial)
      // and if the data exists in local storage.
      // For displayName, if it's a generic default from FirebaseAuthObserver, keep it blank for a fresh setup.
      const isGenericDisplayName =
        currentLocalProfile.displayName === (currentLocalProfile.email?.split('@')[0]) ||
        currentLocalProfile.displayName === 'User';

      if (displayName === '') { // Only set if component state is empty
        if (currentLocalProfile.displayName && !isGenericDisplayName) {
          setDisplayName(currentLocalProfile.displayName);
        } else {
          setDisplayName(''); // Ensure it's blank for new user or generic name
        }
      }

      if (profilePicPreview === null && currentLocalProfile.photoURL) {
        setProfilePicPreview(currentLocalProfile.photoURL);
      }
      if (phoneNumber === '' && currentLocalProfile.phoneNumber) {
        setPhoneNumber(currentLocalProfile.phoneNumber);
      }
      // Bio is not in LocalUserProfile, so it remains as initialized (empty string)

      setIsPageLoading(false);
    } else {
      // No UID in local storage could mean the observer hasn't run or user is not authenticated.
      // FirebaseAuthObserver should handle populating LS. If after a brief period it's still null,
      // then user is likely not logged in.
      console.warn("[ProfileSetupPage] No UID in local profile. Redirecting to login.");
      // A small delay could be added here to wait for observer, but direct redirect is often cleaner.
      router.replace('/login');
    }
  }, [userProfileLs, router]); // Effect re-runs if userProfileLs or router changes. Avoid adding form field states to prevent infinite loops.


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast({ title: "Profile picture selected" });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    console.log("[ProfileSetupPage] handleSubmit - userProfileLs at submission:", userProfileLs);
    console.log(`[ProfileSetupPage] handleSubmit: authUid from state: ${authUid}, authEmail from state: ${authEmail}`);


    if (!authUid || !authEmail) {
      setError('User authentication information is missing. Please try logging in again.');
      toast({ title: "User Info Error", description: "UID or Email missing. Please login.", variant: "destructive" });
      router.push('/login');
      return;
    }

    if (!displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }
    if (phoneNumber && !/^\+?\d{10,15}$/.test(phoneNumber.replace(/\s+/g, ''))) {
      setError('Please enter a valid phone number (e.g., 10 digits or international format like +919876543210).');
      return;
    }

    setIsLoading(true);

    let finalPhotoURL = profilePicPreview;
    if (profilePicFile) {
      // In a real app, you'd upload profilePicFile to Firebase Storage here
      // and get back a URL to store in finalPhotoURL.
      // Since we're not doing that yet, we'll just use the preview (data URI).
      console.warn("Profile picture file selected, but cloud upload not implemented. Using local preview for LS.");
    }
    
    const updatedProfileForLs: LocalUserProfile = {
      uid: authUid,
      email: authEmail,
      displayName: displayName.trim(),
      photoURL: finalPhotoURL,
      phoneNumber: phoneNumber.trim() || null,
      onboardingComplete: true,
      // bio: bio.trim() || null, // Bio is not part of LocalUserProfile type yet
    };
    setUserProfileLs(updatedProfileForLs);

    toast({
      title: `Welcome, ${displayName.trim()}!`,
      description: 'Your BharatConnect account is ready.',
    });
    router.push('/');
    setIsLoading(false);
  };

  const handleLogoutAndStartOver = () => {
    setError('');
    setIsLoading(true); // Prevent double clicks
    signOutUser(auth).then(() => {
        setUserProfileLs(null); // Clear local storage
        toast({ title: "Logged Out", description: "You have been logged out." });
        router.push('/login');
      }).catch((error) => {
        console.error("Error logging out:", error);
        toast({ title: "Logout Error", description: error.message, variant: "destructive" });
      }).finally(() => {
        setIsLoading(false);
      });
  };

  if (isPageLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow min-h-0 bg-background p-4 hide-scrollbar overflow-y-auto">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-muted-foreground">Loading profile setup...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-background p-4 flex-grow min-h-0 hide-scrollbar overflow-y-auto">
      <Card className="w-full max-w-md shadow-2xl my-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="large" />
          </div>
          <CardTitle className="text-2xl font-semibold">Create Your Profile</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Let's get your BharatConnect profile ready.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-2">
              <Label htmlFor="profile-pic-upload" className="cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center relative overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors">
                  {profilePicPreview ? (
                    <Image src={profilePicPreview} alt="Profile preview" layout="fill" objectFit="cover" data-ai-hint="person portrait"/>
                  ) : (
                    <UserCircle2 className="w-16 h-16 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
              </Label>
              <Input id="profile-pic-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <p className="text-xs text-muted-foreground">Tap to upload a profile picture (Optional)</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="auth-email-display">Email</Label>
              <div className="flex items-center space-x-2 p-2.5 rounded-md border bg-muted/30 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span id="auth-email-display" className="flex-1 text-sm">{authEmail || 'Loading email...'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <div className="flex items-center space-x-2">
                 <span className="p-2.5 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm">+91</span>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 rounded-l-none"
                />
              </div>
               <p className="text-xs text-muted-foreground">Helps friends find you and secures your account.</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell us a bit about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
            </div>

            {error && <p id="profile-error" className="text-sm text-destructive text-center">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col space-y-2">
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Complete Setup & Continue'}
            </Button>
            <Button type="button" variant="link" className="mt-2 text-sm text-muted-foreground" onClick={handleLogoutAndStartOver} disabled={isLoading}>
              Logout and start over
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

// Helper function to sign out (imported from firebase.ts, but can be defined here too for clarity if only used here)
// For this example, assuming signOutUser is exported from firebase.ts and auth is available
import { signOut } from "firebase/auth";
const signOutUser = (authInstance: typeof auth) => signOut(authInstance);


export default function ProfileSetupPage() {
  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center flex-grow min-h-0 bg-background p-4 hide-scrollbar overflow-y-auto">
          <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-muted-foreground">Loading page details...</p>
        </div>
      }>
        <ProfileSetupContent />
      </Suspense>
    </div>
  )
}

    