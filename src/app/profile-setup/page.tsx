
"use client";

import { useState, type FormEvent, type ChangeEvent, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { UserCircle2, Camera, Mail } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { auth } from '@/lib/firebase';
import { createOrUpdateUserFullProfile } from '@/services/profileService';
import type { User as AuthUser } from 'firebase/auth';
import Logo from '@/components/shared/Logo';

function ProfileSetupContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [bcName, setBcName] = useState('');
  const [bcPhoneNumber, setBcPhoneNumber] = useState('');
  const [bcBio, setBcBio] = useState('');
  const [bcProfilePicPreview, setBcProfilePicPreview] = useState<string | null>(null);
  const [bcProfilePicFile, setBcProfilePicFile] = useState<File | null>(null); 

  const [authUser, setAuthUser] = useState<AuthUser | null>(auth.currentUser);
  const [authEmail, setAuthEmail] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  const initialProfileLs = useMemo(() => ({ name: '', phone: '', email: '', photoURL: '', username: '' }), []);
  const [userProfileLs, setUserProfileLs] = useLocalStorage('userProfile', initialProfileLs);
  const [, setOnboardingCompleteLs] = useLocalStorage('onboardingComplete', false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthUser(user);
        const emailToSet = user.email || userProfileLs.email; // Prioritize live auth email, fallback to LS
        setAuthEmail(emailToSet);
        console.log("[ProfileSetupPage] Auth user found/updated:", user.uid, emailToSet);

        // Pre-fill name from localStorage if available (e.g., from a previous incomplete attempt)
        if (userProfileLs.name && !bcName) setBcName(userProfileLs.name);
        if (userProfileLs.photoURL && !bcProfilePicPreview) setBcProfilePicPreview(userProfileLs.photoURL);
        // Phone and bio can also be pre-filled if desired, similar to name

        setIsPageLoading(false);
      } else {
        console.warn("[ProfileSetupPage] No auth user found, redirecting to login.");
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, userProfileLs.email, userProfileLs.name, userProfileLs.photoURL, bcName, bcProfilePicPreview]);


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBcProfilePicFile(file); 
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
    if (bcPhoneNumber && !/^\d{10}$/.test(bcPhoneNumber) && !/^\+\d{11,15}$/.test(bcPhoneNumber) ) { 
      setError('Please enter a valid phone number (e.g., 10 digits or international format).');
      return;
    }

    setIsLoading(true);

    try {
      await createOrUpdateUserFullProfile(authUser.uid, {
        name: bcName.trim(),
        email: authEmail, 
        phone: bcPhoneNumber.trim() || undefined,
        photoURL: bcProfilePicPreview || undefined, 
        bio: bcBio.trim() || undefined,
        onboardingComplete: true,
      });

      setUserProfileLs({ 
        name: bcName.trim(),
        phone: bcPhoneNumber.trim(),
        email: authEmail,
        photoURL: bcProfilePicPreview || '', 
        username: '' 
      });
      setOnboardingCompleteLs(true);

      toast({
        title: `Welcome, ${bcName.trim()}!`,
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
      setUserProfileLs(initialProfileLs); 
      setOnboardingCompleteLs(false);   
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
                {/* Optional: country code prefix can be added here if desired, or make input flexible */}
                <Input
                  id="bcPhone"
                  type="tel"
                  placeholder="e.g. 98xxxxxx00 or +9198xxxxxx00"
                  value={bcPhoneNumber}
                  onChange={(e) => setBcPhoneNumber(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            {error && <p id="profile-error" className="text-sm text-destructive text-center">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col space-y-2">
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Complete Setup & Continue'}
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
