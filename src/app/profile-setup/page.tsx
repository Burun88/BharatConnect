
"use client";

import { useState, type FormEvent, type ChangeEvent, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle2, Camera, Mail, AtSign, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/shared/Logo';
import type { User } from '@/types';
import { auth, signOutUser as fbSignOutUser } from '@/lib/firebase'; 
import { createOrUpdateUserFullProfile } from '@/services/profileService';
import { uploadProfileImage, deleteProfileImageByUrl } from '@/services/storageService';
import { generateInitialKeyPair } from '@/services/encryptionService';


function ProfileSetupContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { authUser, setAuthUser, logout } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);

  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);


  useEffect(() => {
    if (authUser) {
      const isGenericDisplayName =
        authUser.name === (authUser.email?.split('@')[0]) ||
        authUser.name === 'User';

      if (displayName === '') {
        if (authUser.name && !isGenericDisplayName) {
          setDisplayName(authUser.name);
        } else {
          setDisplayName('');
        }
      }
      if (username === '' && authUser.username) {
        setUsername(authUser.username);
      }

      if (profilePicPreview === null && authUser.avatarUrl) {
        setProfilePicPreview(authUser.avatarUrl);
      }
      if (phoneNumber === '' && authUser.phone) {
        setPhoneNumber(authUser.phone);
      }
      if (bio === '' && authUser.bio) {
        setBio(authUser.bio);
      }
      
      setIsPageLoading(false);
    } else {
      setIsPageLoading(true);
    }
  }, [authUser, displayName, username, profilePicPreview, phoneNumber, bio]);


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string); 
      };
      reader.readAsDataURL(file);
      toast({ title: "Profile picture selected. Save to upload." });
    }
  };

  const validateUsername = (val: string): boolean => {
    setUsernameError('');
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!val.trim()) {
      setUsernameError('Username is required.');
      return false;
    }
    if (!usernameRegex.test(val)) {
      setUsernameError('Username must be 3-20 characters, lowercase letters, numbers, or underscores only.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setUsernameError('');
    setIsLoading(true);
    
    const authUid = authUser?.id;
    const authEmail = authUser?.email;

    if (!authUid || !authEmail) {
      setError('User authentication information is missing. Please try logging in again.');
      toast({ title: "User Info Error", description: "UID or Email missing. Please login.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const trimmedDisplayName = displayName.trim();
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
        setUsernameError('Username is required.');
        setIsLoading(false);
        return;
    }
    if (!validateUsername(trimmedUsername)) {
        setIsLoading(false);
        return;
    }

    const finalDisplayName = trimmedDisplayName || trimmedUsername;

    if (!finalDisplayName) {
      setError('Please enter your display name.');
      setIsLoading(false);
      return;
    }

    if (phoneNumber && !/^\+?\d{10,15}$/.test(phoneNumber.replace(/\s+/g, ''))) {
      setError('Please enter a valid phone number (e.g., 10 digits or international format like +919876543210).');
      setIsLoading(false);
      return;
    }
    
    let finalPhotoURL = authUser?.avatarUrl || null; 

    if (profilePicFile) {
      try {
        finalPhotoURL = await uploadProfileImage(authUid, profilePicFile);
        toast({ title: "Profile picture uploaded!" });
      } catch (uploadError: any) {
        setError('Failed to upload profile picture. Please try again.');
        toast({ variant: 'destructive', title: 'Upload Error', description: uploadError.message || 'Could not upload image.' });
        setIsLoading(false);
        return;
      }
    } else if (!profilePicPreview) { 
        if (authUser?.avatarUrl) {
            try {
                await deleteProfileImageByUrl(authUser.avatarUrl);
                toast({ title: "Profile picture removed." });
            } catch (deleteError: any) {
                 toast({ variant: 'warning', title: 'Deletion Warning', description: `Could not delete old picture: ${deleteError.message}` });
            }
        }
        finalPhotoURL = null;
    }
    
    const profileDataToSave = {
      email: authEmail,
      username: trimmedUsername,
      displayName: finalDisplayName,
      photoURL: finalPhotoURL,
      phoneNumber: phoneNumber.trim() || null,
      bio: bio.trim() || null,
      onboardingComplete: true,
    };


    try {
      await createOrUpdateUserFullProfile(authUid, profileDataToSave);
      
      toast({ title: "Generating secure keys...", description: "Please wait, this is a one-time setup." });
      await generateInitialKeyPair(authUid);
      toast({ title: "Secure keys generated!", description: "Your account is now end-to-end encrypted." });

      const updatedProfileForContext: User = {
        id: authUid,
        email: authEmail,
        username: trimmedUsername,
        name: finalDisplayName,
        avatarUrl: finalPhotoURL,
        phone: phoneNumber.trim() || undefined,
        bio: bio.trim() || undefined,
        onboardingComplete: true,
        activeKeyId: 'main', // The initial key is always 'main'
      };
      setAuthUser(updatedProfileForContext);

      toast({
        title: `Welcome, ${finalDisplayName}!`,
        description: 'Your BharatConnect account is ready.',
      });

      sessionStorage.setItem('justSignedUp', 'true');
      router.push('/');
    } catch (error: any) {
      setError('Failed to save your profile or generate keys. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Setup Error',
        description: error.message || 'Could not complete profile setup.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutAndStartOver = () => {
    setError('');
    setIsLoading(true);
    logout().finally(() => {
        setIsLoading(false);
    });
  };

  if (isPageLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow min-h-screen bg-background p-4 overflow-y-auto">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-muted-foreground text-center">Loading profile setup...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-background p-4 flex-grow min-h-screen overflow-y-auto">
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
                    <Image src={profilePicPreview} alt="Profile preview" fill sizes="6rem" className="object-cover" data-ai-hint="person portrait"/>
                  ) : (
                    <UserCircle2 className="w-16 h-16 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
              </Label>
              <Input id="profile-pic-upload" type="file" accept="image/*,.heic,.heif" onChange={handleFileChange} className="hidden" />
              <div className="flex items-center gap-2">
                 <p className="text-xs text-muted-foreground">Tap to upload a profile picture (Optional)</p>
                 {profilePicPreview && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-destructive" onClick={() => setProfilePicPreview(null)}>
                        <Trash2 className="w-3 h-3 mr-1"/> Remove
                    </Button>
                 )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="auth-email-display">Email</Label>
              <div className="flex items-center space-x-2 p-2.5 rounded-md border bg-muted/30 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span id="auth-email-display" className="flex-1 text-sm">{authUser?.email || 'Loading email...'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your Name (e.g., same as username if blank)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="your_unique_username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase());
                    validateUsername(e.target.value.toLowerCase());
                  }}
                  onBlur={() => validateUsername(username)}
                  required
                  className="pl-10"
                  aria-describedby="username-error-msg"
                />
              </div>
              {usernameError && <p id="username-error-msg" className="text-xs text-destructive pt-1">{usernameError}</p>}
              {!usernameError && <p className="text-xs text-muted-foreground pt-1">Unique, lowercase, no spaces, 3-20 characters (letters, numbers, underscores).</p>}
            </div>


            <div className="space-y-1">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <div className="flex items-center space-x-2">
                 <span className="p-2.5 rounded-md border bg-muted text-muted-foreground text-sm">+91</span>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="e.g. 98765*****"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1"
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
        <div className="flex flex-col items-center justify-center flex-grow min-h-screen bg-background p-4 overflow-y-auto">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
          <p className="mt-4 text-muted-foreground text-center">Loading page details...</p>
        </div>
      }>
        <ProfileSetupContent />
      </Suspense>
    </div>
  )
}
