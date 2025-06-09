
"use client";

import { useState, type FormEvent, type ChangeEvent, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { UserCircle2, Camera, Phone, User as UserIcon, Mail } from 'lucide-react'; // Renamed User to UserIcon
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { auth } from '@/lib/firebase';
import { createOrUpdateUserFullProfile } from '@/services/profileService'; // Updated import
import type { User as AuthUser } from 'firebase/auth';
import Logo from '@/components/shared/Logo';
import { cn } from '@/lib/utils';

function ProfileSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // State for BharatConnect profile fields
  const [bcName, setBcName] = useState(''); // Name for BharatConnect
  const [bcPhoneNumber, setBcPhoneNumber] = useState('');
  const [bcBio, setBcBio] = useState('');
  const [bcProfilePicPreview, setBcProfilePicPreview] = useState<string | null>(null);
  const [bcProfilePicFile, setBcProfilePicFile] = useState<File | null>(null);

  // State for prefilled/auth data (mostly display or non-editable)
  const [authUser, setAuthUser] = useState<AuthUser | null>(auth.currentUser);
  const [authEmail, setAuthEmail] = useState('');
  const [instaUsername, setInstaUsername] = useState(''); // Prefilled InstaBharat username

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const initialProfileLs = useMemo(() => ({ name: '', phone: '', email: '', photoURL: '', username: '' }), []);
  const [, setUserProfileLs] = useLocalStorage('userProfile', initialProfileLs);
  const [, setOnboardingCompleteLs] = useLocalStorage('onboardingComplete', false);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthUser(user);
        setAuthEmail(user.email || ''); 
        console.log("[ProfileSetupPage] Auth user found:", user.uid, user.email);
      } else {
        console.warn("[ProfileSetupPage] No auth user found, redirecting to login.");
        router.replace('/login'); 
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const namePrefill = searchParams.get('name_prefill');
    const photoPrefill = searchParams.get('photo_prefill');
    const emailQueryParam = searchParams.get('email'); // email from query, could be from auth
    const usernamePrefill = searchParams.get('username_prefill');

    console.log(`[ProfileSetupPage] useEffect - Query Params: name_prefill: ${namePrefill}, photo_prefill: ${photoPrefill}, username_prefill: ${usernamePrefill}, email_query: ${emailQueryParam}`);

    if (namePrefill) setBcName(namePrefill); // Prefill BharatConnect name with InstaBharat name
    if (photoPrefill) setBcProfilePicPreview(photoPrefill); // Prefill BharatConnect photo with InstaBharat photo
    if (usernamePrefill) setInstaUsername(usernamePrefill);
    
    // Ensure authEmail is set from auth.currentUser if available, otherwise from query (less likely path now)
    if (auth.currentUser?.email) {
      setAuthEmail(auth.currentUser.email);
    } else if (emailQueryParam) {
      setAuthEmail(emailQueryParam);
    }

  }, [searchParams]);


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
    if (!bcName.trim()) {
      setError('Please enter your name for BharatConnect.');
      return;
    }
     if (bcPhoneNumber && !/^\d{10}$/.test(bcPhoneNumber)) {
      setError('Please enter a valid 10-digit phone number if you choose to provide one.');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Add bcProfilePicFile upload logic if you want to store it in Firebase Storage
      // For now, bcProfilePicPreview (which could be a data URI or the prefilled URL) is used.
      // If it's a data URI from a new upload, you'd typically upload it here and get a gs:// or https:// URL.
      // If it's the prefilled https:// URL from InstaBharat, it's used directly.

      await createOrUpdateUserFullProfile(authUser.uid, {
        name: bcName.trim(),
        email: authEmail, // Email from auth
        username: instaUsername || undefined, // Save copied InstaBharat username (if any)
        phone: bcPhoneNumber.trim() || undefined,
        photoURL: bcProfilePicPreview || undefined, // Final photo URL for BharatConnect
        bio: bcBio.trim() || undefined,
        onboardingComplete: true, // This is now part of the call
      });
      
      setUserProfileLs({ 
        name: bcName.trim(), 
        phone: bcPhoneNumber.trim(), 
        email: authEmail,
        photoURL: bcProfilePicPreview || '',
        username: instaUsername || ''
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
  
  if (!authUser && !searchParams.get('email')) { 
    return (
         <div className="flex flex-col items-center justify-center h-[calc(var(--vh)*100)] bg-background p-4 hide-scrollbar overflow-y-auto">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-muted-foreground">Loading user information...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-background p-4 h-[calc(var(--vh)*100)] hide-scrollbar overflow-y-auto">
      <Card className="w-full max-w-md shadow-2xl my-8">
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

            {instaUsername && (
              <div className="space-y-1">
                <Label htmlFor="username-display">InstaBharat Username (Read-only)</Label>
                <div className="flex items-center space-x-2 p-2.5 rounded-md border bg-muted/30 text-muted-foreground">
                  <UserIcon className="w-4 h-4" />
                  <span id="username-display" className="flex-1 text-sm">{instaUsername}</span>
                </div>
                <p className="text-xs text-muted-foreground">This username is from your InstaBharat profile.</p>
              </div>
            )}

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
             <Button variant="link" className="mt-2 text-sm text-muted-foreground" onClick={() => auth.signOut().then(() => router.push('/login'))}>
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
    <Suspense fallback={
        <div className="flex flex-col items-center justify-center h-[calc(var(--vh)*100)] bg-background p-4 hide-scrollbar overflow-y-auto">
             <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-muted-foreground">Loading page details...</p>
        </div>
    }>
      <ProfileSetupContent />
    </Suspense>
  )
}
