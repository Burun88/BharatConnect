
"use client";

import React, { useState, useEffect, type ChangeEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle2, Edit3, Save, X, Camera, Mail, Trash2, AtSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile, User } from '@/types'; // Changed import
import { createOrUpdateUserFullProfile } from '@/services/profileService';
import { uploadProfileImage, deleteProfileImageByUrl } from '@/services/storageService'; 

interface ProfileCardProps {
  initialProfileData: User | null; // Changed type to User
  authUid: string | null;
}

export default function ProfileCard({ initialProfileData, authUid }: ProfileCardProps) {
  const { toast } = useToast();
  const [, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);

  const [isEditing, setIsEditing] = useState(false);
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); 
  const [bio, setBio] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null); 
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null); 
  const [isLoading, setIsLoading] = useState(false);

  // Temporary states for editing
  const [tempName, setTempName] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [tempBio, setTempBio] = useState('');
  const [tempProfilePicPreview, setTempProfilePicPreview] = useState<string | null>(null);
  const [originalPhotoURLForPotentialDeletion, setOriginalPhotoURLForPotentialDeletion] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState('');


  useEffect(() => {
    if (initialProfileData) { // initialProfileData is User | null
      const currentDisplayName = initialProfileData.name || ''; // Use .name from User type
      const currentUsername = initialProfileData.username || '';
      const currentEmail = initialProfileData.email || '';
      const currentBio = initialProfileData.bio || '';
      const currentPhotoURL = initialProfileData.avatarUrl || null; // Use .avatarUrl from User type

      setName(currentDisplayName);
      setUsername(currentUsername);
      setEmail(currentEmail);
      setBio(currentBio);
      setProfilePicPreview(currentPhotoURL); 

      if (!isEditing) {
        setTempName(currentDisplayName);
        setTempUsername(currentUsername);
        setTempBio(currentBio);
        setTempProfilePicPreview(currentPhotoURL);
        setOriginalPhotoURLForPotentialDeletion(currentPhotoURL);
      }
    } else {
      const defaultName = 'User';
      const defaultUsername = 'username';
      const defaultEmail = 'Email not available';
      const defaultBio = 'Bio not available';
      
      setName(defaultName);
      setUsername(defaultUsername);
      setEmail(defaultEmail);
      setBio(defaultBio);
      setProfilePicPreview(null);

      if (!isEditing) {
        setTempName(defaultName);
        setTempUsername(defaultUsername);
        setTempBio(defaultBio);
        setTempProfilePicPreview(null);
        setOriginalPhotoURLForPotentialDeletion(null);
      }
    }
  }, [initialProfileData, isEditing]);

  const handleEditToggle = () => {
    if (isEditing) { 
      setTempName(name);
      setTempUsername(username);
      setTempBio(bio);
      setTempProfilePicPreview(profilePicPreview); 
      setOriginalPhotoURLForPotentialDeletion(profilePicPreview); 
      setProfilePicFile(null); 
      setUsernameError('');
    } else { 
      setTempName(name);
      setTempUsername(username);
      setTempBio(bio);
      setTempProfilePicPreview(profilePicPreview);
      setOriginalPhotoURLForPotentialDeletion(profilePicPreview); 
    }
    setIsEditing(!isEditing);
  };

  const handleRemoveProfilePic = () => {
    setTempProfilePicPreview(null); 
    setProfilePicFile(null); 
    toast({ title: "Profile picture marked for removal", description: "Save to apply changes." });
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

  const handleSave = async () => {
    if (!authUid) {
      toast({ variant: 'destructive', title: "Error", description: "User ID not found. Cannot save." });
      return;
    }
    if (!tempName.trim()) {
        toast({ variant: 'destructive', title: "Validation Error", description: "Name cannot be empty."});
        return;
    }
    if (!validateUsername(tempUsername)) {
        return;
    }

    setIsLoading(true);
    
    let finalPhotoURL: string | null = tempProfilePicPreview; 
    let newImageUploaded = false;

    if (profilePicFile) { 
      try {
        finalPhotoURL = await uploadProfileImage(authUid, profilePicFile); 
        newImageUploaded = true;
        toast({ title: "Profile picture uploaded!" });
      } catch (uploadError: any) {
        console.error("[ProfileCard] Error uploading profile picture:", uploadError);
        toast({ variant: 'destructive', title: 'Upload Error', description: uploadError.message || 'Could not upload image.' });
        setIsLoading(false);
        return;
      }
    }

    if (originalPhotoURLForPotentialDeletion) {
      const userRemovedExistingImage = tempProfilePicPreview === null && !profilePicFile;
      const userReplacedExistingImage = newImageUploaded;

      if (userRemovedExistingImage || userReplacedExistingImage) {
        try {
          console.log(`[ProfileCard] Deleting old profile picture: ${originalPhotoURLForPotentialDeletion}`);
          await deleteProfileImageByUrl(originalPhotoURLForPotentialDeletion);
          toast({ title: "Old profile picture deleted." });
        } catch (deleteError: any) {
          console.error("[ProfileCard] Error deleting old profile picture:", deleteError);
          toast({ variant: 'warning', title: 'Deletion Warning', description: `Could not delete old picture: ${deleteError.message}` });
        }
      }
    }
    if (tempProfilePicPreview === null && !profilePicFile) { 
        finalPhotoURL = null;
    }
    
    const profileDataToSave = {
      email: email, 
      username: tempUsername.trim(),
      displayName: tempName.trim(),
      originalDisplayName: tempName.trim(), // Save tempName as originalDisplayName too
      photoURL: finalPhotoURL, 
      phoneNumber: initialProfileData?.phone || null, // Use .phone from User type
      bio: tempBio.trim() || null,
      onboardingComplete: true, 
    };

    try {
      await createOrUpdateUserFullProfile(authUid, profileDataToSave);

      setName(tempName.trim());
      setUsername(tempUsername.trim());
      setBio(tempBio.trim() || '');
      setProfilePicPreview(finalPhotoURL); 
      setProfilePicFile(null); 
      setOriginalPhotoURLForPotentialDeletion(finalPhotoURL); 

      setUserProfileLs(prev => {
        const baseProfile = (prev && prev.uid === authUid) ? prev : { uid: authUid, email: email };
        return {
          ...baseProfile,
          name: tempName.trim(), // Update .name in LocalUserProfile
          username: tempUsername.trim(),
          avatarUrl: finalPhotoURL, // Update .avatarUrl in LocalUserProfile
          bio: tempBio.trim() || null,
          onboardingComplete: true,
        } as LocalUserProfile;
      });

      setIsEditing(false);
      setUsernameError('');
      toast({ title: "Profile Updated", description: "Your changes have been saved to the server." });
    } catch (error: any) {
      console.error("[ProfileCard] Error saving profile to Firestore:", error);
      toast({ variant: 'destructive', title: "Save Failed", description: error.message || "Could not save profile to server." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setTempName(name);
    setTempUsername(username);
    setTempBio(bio);
    setTempProfilePicPreview(profilePicPreview); 
    setProfilePicFile(null); 
    setOriginalPhotoURLForPotentialDeletion(profilePicPreview); 
    setUsernameError('');
    setIsEditing(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfilePicFile(file); 
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempProfilePicPreview(reader.result as string); 
      };
      reader.readAsDataURL(file);
      toast({ title: "New picture selected", description: "Save to apply changes." });
    }
  };

  const displayAvatarSrc = isEditing ? tempProfilePicPreview : profilePicPreview;

  return (
    <Card className="rounded-2xl shadow-md bg-card">
      <CardHeader className="items-center text-center">
        <div className="relative">
          <Avatar className="w-[100px] h-[100px] border-2 border-border">
            {displayAvatarSrc ? (
              <AvatarImage src={displayAvatarSrc} alt="Profile Picture" key={displayAvatarSrc + (isEditing ? '-edit' : '-view')} data-ai-hint="person avatar"/>
            ) : null}
            <AvatarFallback className="bg-muted">
              <UserCircle2 className="w-16 h-16 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          {isEditing && (
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-1 right-1 rounded-full w-8 h-8 bg-muted hover:bg-muted/80 border-background border-2"
              onClick={() => document.getElementById('profile-pic-upload-account')?.click()}
              aria-label="Change profile picture"
              disabled={isLoading}
            >
              <Camera className="w-4 h-4" />
            </Button>
          )}
        </div>
        <Input id="profile-pic-upload-account" type="file" accept="image/*,.heic,.heif" onChange={handleFileChange} className="hidden" disabled={!isEditing || isLoading} />
        
        <CardTitle className="mt-4 text-xl">{isEditing ? tempName : name}</CardTitle>
        
        {isEditing && displayAvatarSrc && ( 
          <Button
            variant="link"
            size="sm"
            className="text-destructive hover:text-destructive/80 mt-1"
            onClick={handleRemoveProfilePic}
            disabled={isLoading}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Remove Profile Picture
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name-account" className="text-muted-foreground">Display Name</Label>
          {isEditing ? (
            <Input
              id="name-account"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="mt-1 bg-input"
              disabled={isLoading}
            />
          ) : (
            <p className="mt-1 text-foreground min-h-[2.5rem] flex items-center px-3 py-2 rounded-md border border-transparent"> 
              {name || <span className="text-muted-foreground italic">Not set</span>}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="username-account" className="text-muted-foreground">Username</Label>
          {isEditing ? (
            <>
            <div className="relative mt-1">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="username-account"
                value={tempUsername}
                onChange={(e) => {
                  setTempUsername(e.target.value.toLowerCase());
                  validateUsername(e.target.value.toLowerCase());
                }}
                onBlur={() => validateUsername(tempUsername)}
                className="bg-input pl-10"
                disabled={isLoading}
                aria-describedby="username-edit-error-msg"
              />
            </div>
            {usernameError && <p id="username-edit-error-msg" className="text-xs text-destructive pt-1">{usernameError}</p>}
            </>
          ) : (
            <div className="flex items-center space-x-2 mt-1 p-2.5 rounded-md border border-transparent text-foreground">
              <AtSign className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm">{username || <span className="text-muted-foreground italic">Not set</span>}</span>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="email-account" className="text-muted-foreground">Email</Label>
          <div className="flex items-center space-x-2 mt-1 p-2.5 rounded-md border bg-muted/30 text-muted-foreground cursor-not-allowed">
            <Mail className="w-4 h-4" />
            <span id="email-account" className="flex-1 text-sm">{email || 'Loading...'}</span>
          </div>
        </div>
        <div>
          <Label htmlFor="bio-account" className="text-muted-foreground">Bio</Label>
          {isEditing ? (
            <Textarea
              id="bio-account"
              value={tempBio}
              onChange={(e) => setTempBio(e.target.value)}
              rows={3}
              className="mt-1 bg-input"
              placeholder="Tell us about yourself..."
              disabled={isLoading}
            />
          ) : (
             <p className="mt-1 text-foreground whitespace-pre-line min-h-[5rem] px-3 py-2 rounded-md border border-transparent"> 
              {bio || <span className="text-muted-foreground italic">No bio set.</span>}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {isEditing ? (
          <>
            <Button variant="ghost" onClick={handleCancel} disabled={isLoading}>
              <X className="mr-1 w-4 h-4" /> Cancel
            </Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-accent to-primary text-primary-foreground hover:opacity-90 transition-opacity" disabled={isLoading}>
              {isLoading ? <><svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...</> : <><Save className="mr-1 w-4 h-4" /> Save</>}
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={handleEditToggle}>
            <Edit3 className="mr-1 w-4 h-4" /> Edit Profile
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
