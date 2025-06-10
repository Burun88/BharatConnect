
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
import { auth, signOutUser as fbSignOutUser } from '@/lib/firebase'; 
import { createOrUpdateUserFullProfile } from '@/services/profileService';

function ProfileSetupContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);

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
    console.log("[ProfileSetupPage] useEffect - userProfileLs:", currentLocalProfile);

    if (currentLocalProfile?.uid) {
      setAuthUid(currentLocalProfile.uid);
      setAuthEmail(currentLocalProfile.email || '');

      if (currentLocalProfile.onboardingComplete === true) {
        console.log("[ProfileSetupPage] User from LS already onboarded. Redirecting to home.");
        router.replace('/');
        return; 
      }

      const isGenericDisplayName =
        currentLocalProfile.displayName === (currentLocalProfile.email?.split('@')[0]) ||
        currentLocalProfile.displayName === 'User';

      if (displayName === '') {
        if (currentLocalProfile.displayName && !isGenericDisplayName) {
          setDisplayName(currentLocalProfile.displayName);
        } else {
          setDisplayName('');
        }
      }

      if (profilePicPreview === null && currentLocalProfile.photoURL) {
        setProfilePicPreview(currentLocalProfile.photoURL);
      }
      if (phoneNumber === '' && currentLocalProfile.phoneNumber) {
        setPhoneNumber(currentLocalProfile.phoneNumber);
      }
      if (bio === '' && currentLocalProfile.bio) {
        setBio(currentLocalProfile.bio);
      }
      
      setIsPageLoading(false);
    } else {
      console.warn("[ProfileSetupPage] No UID in local profile or LS is null. Redirecting to login.");
      router.replace('/login');
    }
  }, [userProfileLs, router, displayName, profilePicPreview, phoneNumber, bio]);


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

    console.log("[ProfileSetupPage] handleSubmit triggered.");
    console.log(`[ProfileSetupPage] Current state: authUid=${authUid}, authEmail=${authEmail}`);

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
    // In a real app, you'd upload profilePicFile to Firebase Storage here
    // and get back a URL to store in finalPhotoURL.
    // For now, we are directly saving the data URI if a new pic is chosen,
    // or the existing URL if no new pic is chosen.
    if (profilePicFile) {
        console.warn("[ProfileSetupPage] New profile picture file selected. Using data URI for Firestore. Cloud upload not implemented.");
    }
    
    const profileDataToSave = {
      email: authEmail,
      displayName: displayName.trim(),
      photoURL: finalPhotoURL, // This could be a data URI
      phoneNumber: phoneNumber.trim() || null,
      bio: bio.trim() || null,
      onboardingComplete: true,
    };

    console.log("[ProfileSetupPage] Attempting to save to Firestore. UID:", authUid);
    console.log("[ProfileSetupPage] Data to save:", JSON.stringify(profileDataToSave));

    try {
      await createOrUpdateUserFullProfile(authUid, profileDataToSave);

      const updatedProfileForLs: LocalUserProfile = {
        uid: authUid,
        email: authEmail,
        displayName: displayName.trim(),
        photoURL: finalPhotoURL,
        phoneNumber: phoneNumber.trim() || null,
        bio: bio.trim() || null,
        onboardingComplete: true,
      };
      setUserProfileLs(updatedProfileForLs);
      console.log("[ProfileSetupPage] Profile saved to Firestore and LS updated:", updatedProfileForLs);

      toast({
        title: `Welcome, ${displayName.trim()}!`,
        description: 'Your BharatConnect account is ready.',
      });
      router.push('/');
    } catch (error: any) {
      console.error("[ProfileSetupPage] Error during handleSubmit (saving profile):", error);
      setError('Failed to save your profile. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Profile Save Error',
        description: error.message || 'Could not save profile.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutAndStartOver = () => {
    setError('');
    setIsLoading(true);
    fbSignOutUser(auth).then(() => {
        setUserProfileLs(null); 
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
