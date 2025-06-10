
"use client";

import { useState, type FormEvent, type ChangeEvent, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle2, Camera, Mail, Phone } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { auth } from '@/lib/firebase';
import { createOrUpdateUserFullProfile } from '@/services/profileService';
import type { User as AuthUser } from 'firebase/auth';
import Logo from '@/components/shared/Logo';
import type { LocalUserProfile } from '@/types';

function ProfileSetupContent() {
  const router = useRouter();
  const { toast } = useToast();

  const initialProfileLs = {} as LocalUserProfile;
  const [userProfileLs, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', initialProfileLs);
  const [, setOnboardingCompleteLs] = useLocalStorage('onboardingComplete', false);

  const [displayName, setDisplayName] = useState(userProfileLs?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(userProfileLs?.phoneNumber || '');
  const [bio, setBio] = useState(''); // Bio can be fresh for this setup
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(userProfileLs?.photoURL || null);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null); 

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authUid, setAuthUid] = useState<string | null>(userProfileLs?.uid || null);
  const [authEmail, setAuthEmail] = useState<string>(userProfileLs?.email || '');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthUser(user);
        if (!authUid) setAuthUid(user.uid); // Prefer LS uid if exists from signup step
        if (!authEmail && user.email) setAuthEmail(user.email); // Prefer LS email
        
        console.log("[ProfileSetupPage] Auth user/LS data processed:", { uid: authUid || user.uid, email: authEmail || user.email });

        // Pre-fill name from localStorage if available (e.g., from Google Sign-In via Login Hub)
        if (userProfileLs?.displayName && !displayName) setDisplayName(userProfileLs.displayName);
        if (userProfileLs?.photoURL && !profilePicPreview) setProfilePicPreview(userProfileLs.photoURL);
        
        setIsPageLoading(false);
      } else {
        // If no auth user and no UID from LS (meaning didn't come from signup)
        if (!authUid) {
          console.warn("[ProfileSetupPage] No auth user & no UID from LS, redirecting to login.");
          router.replace('/login');
        } else {
          // Has UID/Email from LS (came from signup), but auth state might be initializing.
          // This state is fine as long as authUid and authEmail are set.
          setIsPageLoading(false); 
        }
      }
    });
    return () => unsubscribe();
  }, [router, userProfileLs, authUid, authEmail, displayName, profilePicPreview]);


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

    if (!authUid || !authEmail) {
      setError('User authentication information is missing. Please try logging in or signing up again.');
      toast({ title: "Authentication Error", description: "UID or Email missing. Please restart signup/login.", variant: "destructive" });
      router.push('/login');
      return;
    }
    console.log(`[ProfileSetupPage] handleSubmit: authUid: ${authUid}, authEmail: ${authEmail}`);

    if (!displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }
    if (phoneNumber && !/^\+?\d{10,15}$/.test(phoneNumber.replace(/\s+/g, ''))) { 
      setError('Please enter a valid phone number (e.g., 10 digits or international format like +919876543210).');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: If profilePicFile exists, upload it to Firebase Storage first,
      // then get the downloadURL to store in Firestore.
      // For now, we'll use the preview (data URL or existing URL) directly if no new file.
      // This part needs actual Firebase Storage integration later.
      let finalPhotoURL = profilePicPreview;
      if (profilePicFile) {
        // Placeholder: In a real app, upload profilePicFile to Firebase Storage
        // and get the download URL.
        // finalPhotoURL = await uploadProfilePic(authUid, profilePicFile);
        console.warn("Profile picture file selected, but upload to Firebase Storage not implemented yet. Using preview URL if available.");
        toast({ title: "Note", description: "Profile picture upload to cloud storage is a TODO."});
      }


      await createOrUpdateUserFullProfile(authUid, {
        displayName: displayName.trim(),
        email: authEmail, 
        photoURL: finalPhotoURL, 
        phoneNumber: phoneNumber.trim() || null,
        bio: bio.trim() || undefined,
        onboardingComplete: true,
        // status and languagePreference will use defaults in service or be undefined
      });

      const updatedProfileForLs: LocalUserProfile = { 
        uid: authUid,
        email: authEmail,
        displayName: displayName.trim(),
        photoURL: finalPhotoURL, 
        phoneNumber: phoneNumber.trim() || null,
      };
      setUserProfileLs(updatedProfileForLs);
      setOnboardingCompleteLs(true);

      toast({
        title: `Welcome, ${displayName.trim()}!`,
        description: 'Your BharatConnect account is ready.',
      });
      router.push('/');

    } catch (err: any) {
      console.error("[ProfileSetupPage] Error saving profile:", err);
      setError(err.message || 'Failed to save profile. Please try again.');
      toast({
        title: 'Profile Save Failed',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutAndStartOver = () => {
    setError(''); 
    auth.signOut().then(() => {
      setUserProfileLs(null); 
      setOnboardingCompleteLs(false);   
      router.push('/login'); // Go to the new login hub
    }).catch(error => {
      console.error("Error signing out: ", error);
      toast({title: "Logout Error", description: "Could not sign out.", variant: "destructive"});
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
                <span id="auth-email-display" className="flex-1 text-sm">{authEmail || 'Email not found'}</span>
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
            <Button type="button" variant="link" className="mt-2 text-sm text-muted-foreground" onClick={handleLogoutAndStartOver}>
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
