
"use client";

import { useState, type FormEvent, type ChangeEvent, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
// AlertDialog components removed as they are no longer needed
import { UserCircle2, Camera, Mail } from 'lucide-react'; // UserIcon removed, Phone icon can be added back if desired
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { auth } from '@/lib/firebase';
import { createOrUpdateUserFullProfile } from '@/services/profileService';
import type { User as AuthUser } from 'firebase/auth';
import Logo from '@/components/shared/Logo';
// cn utility is not used here currently, can be removed if not added later

function ProfileSetupContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [bcName, setBcName] = useState('');
  const [bcPhoneNumber, setBcPhoneNumber] = useState('');
  const [bcBio, setBcBio] = useState('');
  const [bcProfilePicPreview, setBcProfilePicPreview] = useState<string | null>(null);
  const [bcProfilePicFile, setBcProfilePicFile] = useState<File | null>(null); // Retained for potential future direct upload

  const [authUser, setAuthUser] = useState<AuthUser | null>(auth.currentUser);
  const [authEmail, setAuthEmail] = useState('');
  // instaUsername and related states removed

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  const initialProfileLs = useMemo(() => ({ name: '', phone: '', email: '', photoURL: '', username: '' }), []);
  const [userProfileLs, setUserProfileLs] = useLocalStorage('userProfile', initialProfileLs);
  const [, setOnboardingCompleteLs] = useLocalStorage('onboardingComplete', false);
  // tempInstaBharatProfileData and related states/effects removed
  // showInstaBharatPrompt and related states/effects removed

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthUser(user);
        setAuthEmail(user.email || '');
        console.log("[ProfileSetupPage] Auth user found:", user.uid, user.email);
        // Populate email from localStorage if authUser.email is somehow null but LS has it
        // This case might happen if userProfileLs was set before auth state fully propagated
        if (!user.email && userProfileLs.email) {
            setAuthEmail(userProfileLs.email);
        }
        setIsPageLoading(false); // No more dialog, so set loading to false
      } else {
        console.warn("[ProfileSetupPage] No auth user found, redirecting to login.");
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, userProfileLs.email]); // Added userProfileLs.email to dependencies


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBcProfilePicFile(file); // Store the file if direct upload is implemented later
      const reader = new FileReader();
      reader.onloadend = () => {
        setBcProfilePicPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast({ title: "Profile picture selected" });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!authUser || !authUser.uid) {
      setError('User not authenticated. Please login again.');
      toast({ title: "Authentication Error", description: "Please log in again.", variant: "destructive" });
      router.push('/login');
      return;
    }
    console.log(`[ProfileSetupPage] handleSubmit: authUser.uid: ${authUser.uid}, authEmail: ${authEmail}`);

    if (!bcName.trim()) {
      setError('Please enter your name for BharatConnect.');
      return;
    }
    if (bcPhoneNumber && !/^\d{10}$/.test(bcPhoneNumber)) { // Basic 10-digit validation
      setError('Please enter a valid 10-digit phone number (optional).');
      return;
    }

    setIsLoading(true);

    try {
      // The photoURL sent here will be the base64 data URI.
      // A real implementation would upload bcProfilePicFile to Firebase Storage
      // and then save the download URL. For now, base64 is fine for mock.
      await createOrUpdateUserFullProfile(authUser.uid, {
        name: bcName.trim(),
        email: authEmail, // Ensure email is from authUser or reliable source
        phone: bcPhoneNumber.trim() || undefined,
        photoURL: bcProfilePicPreview || undefined, // This would be a storage URL in prod
        bio: bcBio.trim() || undefined,
        onboardingComplete: true,
      });

      setUserProfileLs({ // Update localStorage with the new profile
        name: bcName.trim(),
        phone: bcPhoneNumber.trim(),
        email: authEmail,
        photoURL: bcProfilePicPreview || '', // Store preview URL or empty
        username: '' // Username is no longer part of this flow
      });
      setOnboardingCompleteLs(true);

      toast({
        title: 'BharatConnect Profile Saved!',
        description: `Welcome, ${bcName.trim()}!`,
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
      setUserProfileLs(initialProfileLs); // Clear user profile from LS
      setOnboardingCompleteLs(false);   // Reset onboarding status
      router.push('/login');
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
          <CardDescription className="text-muted-foreground pt-2">
            Setup your BharatConnect Profile
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-2">
              <Label htmlFor="profile-pic-upload" className="cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center relative overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors">
                  {bcProfilePicPreview ? (
                    <Image src={bcProfilePicPreview} alt="Profile preview" layout="fill" objectFit="cover" data-ai-hint="person portrait"/>
                  ) : (
                    <UserCircle2 className="w-16 h-16 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
              </Label>
              <Input id="profile-pic-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <p className="text-xs text-muted-foreground">Tap to upload your BharatConnect picture</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="auth-email-display">Email</Label>
              <div className="flex items-center space-x-2 p-2.5 rounded-md border bg-muted/30 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span id="auth-email-display" className="flex-1 text-sm">{authEmail || 'Loading email...'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="bcName">Your Name for BharatConnect</Label>
              <Input
                id="bcName"
                type="text"
                placeholder="Your Name"
                value={bcName}
                onChange={(e) => setBcName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bcBio">Bio (Optional)</Label>
              <Textarea
                id="bcBio"
                placeholder="Tell us about yourself..."
                value={bcBio}
                onChange={(e) => setBcBio(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bcPhone">Phone Number (Optional)</Label>
              <div className="flex items-center space-x-2">
                <span className="p-2.5 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm">+91</span>
                <Input
                  id="bcPhone"
                  type="tel"
                  placeholder="98xxxxxx00"
                  value={bcPhoneNumber}
                  onChange={(e) => setBcPhoneNumber(e.target.value)}
                  maxLength={10}
                  className="flex-1 rounded-l-none"
                />
              </div>
            </div>
            {error && <p id="profile-error" className="text-sm text-destructive text-center">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col space-y-2">
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Profile & Continue'}
            </Button>
            <Button variant="link" className="mt-2 text-sm text-muted-foreground" onClick={handleLogoutAndStartOver}>
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
