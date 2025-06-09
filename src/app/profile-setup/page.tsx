
"use client";

import { useState, type FormEvent, type ChangeEvent, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle2, Camera, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { auth } from '@/lib/firebase';
import { createOrUpdateBharatConnectProfile } from '@/services/profileService';
import type { User as AuthUser } from 'firebase/auth'; // Renamed to avoid conflict
import Logo from '@/components/shared/Logo'; // Import Logo

function ProfileSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // State for form fields
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null); // To upload if necessary

  // User and error states
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(auth.currentUser);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // LocalStorage for onboarding status and basic profile info
  const initialProfile = useMemo(() => ({ name: '', phone: '', email: '' }), []);
  const [userProfileLs, setUserProfileLs] = useLocalStorage('userProfile', initialProfile);
  const [, setOnboardingCompleteLs] = useLocalStorage('onboardingComplete', false);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        setEmail(user.email || ''); // Set email from auth
      } else {
        router.replace('/login'); // If no user, redirect to login
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    // Pre-fill from query parameters (e.g., from InstaBharat)
    const namePrefill = searchParams.get('name_prefill');
    const photoPrefill = searchParams.get('photo_prefill');
    const emailPrefill = searchParams.get('email');

    if (namePrefill) setName(namePrefill);
    if (photoPrefill) setProfilePicPreview(photoPrefill); // This might be a URL
    if (emailPrefill && !auth.currentUser?.email) setEmail(emailPrefill); // If auth email not yet set

  }, [searchParams]);


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfilePicFile(file); // Store the file itself
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
    if (!currentUser) {
      setError('User not authenticated. Please login again.');
      router.push('/login');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
     if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number if you choose to provide one.');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: If profilePicFile exists, upload it to Firebase Storage and get URL
      // For now, we'll use profilePicPreview if it's a URL (from InstaBharat) or null
      let finalPhotoURL = profilePicPreview; // Assuming it could be an existing URL
      // if (profilePicFile) { /* ... upload logic ... */ finalPhotoURL = uploadedUrl; }


      await createOrUpdateBharatConnectProfile(currentUser.uid, {
        name: name.trim(),
        email: currentUser.email || email, // Ensure email is from auth user
        phone: phoneNumber.trim() || undefined,
        photoURL: finalPhotoURL || undefined,
        onboardingComplete: true,
      });
      
      setUserProfileLs({ name: name.trim(), phone: phoneNumber.trim(), email: currentUser.email || email });
      setOnboardingCompleteLs(true);
      
      toast({
        title: 'Profile Saved!',
        description: `Welcome, ${name.trim()}!`,
      });
      router.push('/');

    } catch (err: any) {
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
  
  if (!currentUser && !searchParams.get('email')) { // Wait for auth state or email from query
    return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <p>Loading user information...</p>
        </div>
    );
  }


  return (
    <div className="flex flex-col items-center bg-background p-4 min-h-screen overflow-y-auto py-8">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-6">
             <Logo size="large" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-gradient-primary-accent">
            Setup Your BharatConnect Profile
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Let others know who you are. Your email: {currentUser?.email || email}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-2">
              <Label htmlFor="profile-pic-upload" className="cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center relative overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors">
                  {profilePicPreview ? (
                    <Image src={profilePicPreview} alt="Profile preview" layout="fill" objectFit="cover" data-ai-hint="person portrait" />
                  ) : (
                    <UserCircle2 className="w-16 h-16 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
              </Label>
              <Input id="profile-pic-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <p className="text-xs text-muted-foreground">Tap to upload a profile picture</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-describedby="name-error"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-md border bg-muted text-muted-foreground">+91</span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="98xxxxxx00"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  maxLength={10}
                  className="flex-1"
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
    <Suspense fallback={<div>Loading page details...</div>}>
      <ProfileSetupContent />
    </Suspense>
  )
}
