
"use client";

import React, { useState, useEffect, type ChangeEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle2, Edit3, Save, X, Camera, Mail, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';
import type { BharatConnectFirestoreUser } from '@/services/profileService';
import { createOrUpdateUserFullProfile } from '@/services/profileService';
import { uploadProfileImage } from '@/services/storageService';

interface ProfileCardProps {
  initialProfileData: BharatConnectFirestoreUser | null;
  authUid: string | null;
}

export default function ProfileCard({ initialProfileData, authUid }: ProfileCardProps) {
  const { toast } = useToast();
  const [, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);

  const [isEditing, setIsEditing] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); 
  const [bio, setBio] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null); 
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null); 
  const [isLoading, setIsLoading] = useState(false);

  // Temporary states for editing
  const [tempName, setTempName] = useState('');
  const [tempBio, setTempBio] = useState('');
  const [tempProfilePicPreview, setTempProfilePicPreview] = useState<string | null>(null);
  const [originalPhotoURLForDeletion, setOriginalPhotoURLForDeletion] = useState<string | null>(null);


  useEffect(() => {
    if (initialProfileData) {
      setName(initialProfileData.displayName || '');
      setEmail(initialProfileData.email || '');
      setBio(initialProfileData.bio || '');
      setProfilePicPreview(initialProfileData.photoURL || null); 

      // Initialize temp states only if not currently editing or if initial data changes
      if (!isEditing) {
        setTempName(initialProfileData.displayName || '');
        setTempBio(initialProfileData.bio || '');
        setTempProfilePicPreview(initialProfileData.photoURL || null);
        setOriginalPhotoURLForDeletion(initialProfileData.photoURL || null);
      }
    } else {
      // Fallback if initialProfileData is null
      setName('User');
      setEmail('Email not available');
      setBio('Bio not available');
      setProfilePicPreview(null);
      if (!isEditing) {
        setTempName('User');
        setTempBio('Bio not available');
        setTempProfilePicPreview(null);
        setOriginalPhotoURLForDeletion(null);
      }
    }
  }, [initialProfileData, isEditing]);

  const handleEditToggle = () => {
    if (isEditing) { // Means "Cancel" was effectively clicked or edit mode is being exited
      // Reset temp fields to current non-edit values
      setTempName(name);
      setTempBio(bio);
      setTempProfilePicPreview(profilePicPreview); 
      setOriginalPhotoURLForDeletion(profilePicPreview); // Reset for next edit session
      setProfilePicFile(null); // Clear any selected file
    } else { // Means "Edit Profile" was clicked, entering edit mode
      // Populate temp fields with current values
      setTempName(name);
      setTempBio(bio);
      setTempProfilePicPreview(profilePicPreview);
      setOriginalPhotoURLForDeletion(profilePicPreview); // Store the URL that was there when editing started
    }
    setIsEditing(!isEditing);
  };

  const handleRemoveProfilePic = () => {
    setTempProfilePicPreview(null);
    setProfilePicFile(null); // Also clear any newly selected file
    toast({ title: "Profile picture marked for removal", description: "Save to apply changes." });
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
    setIsLoading(true);
    
    let finalPhotoURL = tempProfilePicPreview; // Start with the current preview (could be null if removed)

    // If a new file was selected, upload it
    if (profilePicFile) { 
      try {
        console.log(`[ProfileCard] Preparing FormData for new profile picture. UID: ${authUid}`);
        const formData = new FormData();
        formData.append('uid', authUid); 
        formData.append('profileImageFile', profilePicFile);
        
        console.log("[ProfileCard] FormData entries before calling server action:");
        for (let pair of formData.entries()) {
          console.log(pair[0]+ ', ' + (pair[1] instanceof File ? `File: ${pair[1].name}, size: ${pair[1].size}, type: ${pair[1].type}` : pair[1]));
        }
        
        finalPhotoURL = await uploadProfileImage(formData); // This will be the new URL
        console.log(`[ProfileCard] New profile picture uploaded. URL: ${finalPhotoURL}`);
        toast({ title: "Profile picture uploaded!" });
      } catch (uploadError: any) {
        console.error("[ProfileCard] Error uploading profile picture:", uploadError);
        toast({ variant: 'destructive', title: 'Upload Error', description: uploadError.message || 'Could not upload image.' });
        setIsLoading(false);
        return;
      }
    } else if (tempProfilePicPreview === null && originalPhotoURLForDeletion) {
      // No new file, but picture was removed (tempProfilePicPreview is null) AND there was an original picture.
      // Here, you might call a delete function for originalPhotoURLForDeletion if you had one.
      // For now, finalPhotoURL is already null, which is correct for saving.
      console.log(`[ProfileCard] Profile picture removed by user. Original URL was: ${originalPhotoURLForDeletion}`);
    }
    
    const profileDataToSave = {
      email: email, 
      displayName: tempName.trim(),
      photoURL: finalPhotoURL, // This will be null if removed, or new URL if changed, or old URL if untouched.
      phoneNumber: initialProfileData?.phoneNumber || null, 
      bio: tempBio.trim() || null,
      onboardingComplete: true, 
    };

    try {
      console.log("[ProfileCard] Attempting to save profile to Firestore. Data:", JSON.stringify(profileDataToSave));
      await createOrUpdateUserFullProfile(authUid, profileDataToSave);

      // Update main state from temp state
      setName(tempName.trim());
      setBio(tempBio.trim() || '');
      setProfilePicPreview(finalPhotoURL); 
      setProfilePicFile(null); // Clear selected file after save

      setUserProfileLs(prev => {
        if (!prev || prev.uid !== authUid) return prev; 
        return {
          ...prev,
          displayName: tempName.trim(),
          photoURL: finalPhotoURL,
          bio: tempBio.trim() || null,
          onboardingComplete: true,
        };
      });

      setIsEditing(false);
      toast({ title: "Profile Updated", description: "Your changes have been saved to the server." });
    } catch (error: any) {
      console.error("[ProfileCard] Error saving profile to Firestore:", error);
      toast({ variant: 'destructive', title: "Save Failed", description: error.message || "Could not save profile to server." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset temp fields to current main state
    setTempName(name);
    setTempBio(bio);
    setTempProfilePicPreview(profilePicPreview); 
    setProfilePicFile(null); // Clear any selected file
    setOriginalPhotoURLForDeletion(profilePicPreview); // Reset this too
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
      toast({ title: "Profile picture selected", description: "Save to apply changes." });
    }
  };

  const displayAvatarSrc = isEditing ? tempProfilePicPreview : profilePicPreview;

  return (
    <Card className="rounded-2xl shadow-md bg-card">
      <CardHeader className="items-center text-center">
        <div className="relative">
          <div className="p-1 rounded-full bg-gradient-to-br from-primary to-accent">
            <Avatar className="w-[100px] h-[100px] border-2 border-background">
              {displayAvatarSrc ? (
                 <AvatarImage src={displayAvatarSrc} alt="Profile Picture" key={displayAvatarSrc} data-ai-hint="person avatar"/> 
              ) : (
                <AvatarFallback className="bg-muted">
                  <UserCircle2 className="w-16 h-16 text-muted-foreground" />
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          {isEditing && (
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-1 right-1 rounded-full w-8 h-8 bg-muted hover:bg-muted/80 border-background border-2"
              onClick={() => document.getElementById('profile-pic-upload-account')?.click()}
              aria-label="Change profile picture"
            >
              <Camera className="w-4 h-4" />
            </Button>
          )}
          <Input id="profile-pic-upload-account" type="file" accept="image/*,.heic,.heif" onChange={handleFileChange} className="hidden" disabled={!isEditing || isLoading} />
        </div>
        <CardTitle className="mt-4 text-xl">{isEditing ? tempName : name}</CardTitle>
        {isEditing && tempProfilePicPreview && (
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
          <Label htmlFor="name-account" className="text-muted-foreground">Name</Label>
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
    