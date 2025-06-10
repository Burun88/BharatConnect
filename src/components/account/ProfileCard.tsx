
"use client";

import React, { useState, useEffect, type ChangeEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle2, Edit3, Save, X, Camera, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';
import type { BharatConnectFirestoreUser } from '@/services/profileService';
import { createOrUpdateUserFullProfile } from '@/services/profileService';

interface ProfileCardProps {
  initialProfileData: BharatConnectFirestoreUser | null;
  authUid: string | null;
}

export default function ProfileCard({ initialProfileData, authUid }: ProfileCardProps) {
  const { toast } = useToast();
  const [, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);

  const [isEditing, setIsEditing] = useState(false);
  
  // State for form fields, initialized from props or defaults
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); // Email is not editable by user directly
  const [bio, setBio] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null); // For new image upload

  // Temporary state for edits
  const [tempName, setTempName] = useState('');
  const [tempBio, setTempBio] = useState('');
  // Temp email is not needed as it's not editable
  const [tempProfilePicPreview, setTempProfilePicPreview] = useState<string | null>(null);


  useEffect(() => {
    if (initialProfileData) {
      setName(initialProfileData.displayName || '');
      setEmail(initialProfileData.email || '');
      setBio(initialProfileData.bio || '');
      setProfilePicPreview(initialProfileData.photoURL || null);

      // Initialize temp states when initial data loads or editing is cancelled
      if (!isEditing) {
        setTempName(initialProfileData.displayName || '');
        setTempBio(initialProfileData.bio || '');
        setTempProfilePicPreview(initialProfileData.photoURL || null);
      }
    } else {
      // Fallback if no initial profile (e.g., Firestore fetch failed)
      // Could also pull from local storage as a secondary fallback if needed
      setName('User');
      setEmail('Email not available');
      setBio('Bio not available');
      setProfilePicPreview(null);
    }
  }, [initialProfileData, isEditing]);

  const handleEditToggle = () => {
    if (isEditing) {
      // If cancelling, reset temp values to current persistent values
      setTempName(name);
      setTempBio(bio);
      setTempProfilePicPreview(profilePicPreview);
      setProfilePicFile(null); // Clear any staged file
    } else {
      // If starting to edit, copy current values to temp values
      setTempName(name);
      setTempBio(bio);
      setTempProfilePicPreview(profilePicPreview);
    }
    setIsEditing(!isEditing);
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

    // In a real app, if profilePicFile exists, upload it to Firebase Storage first,
    // then get the downloadURL to save in Firestore.
    // For now, we'll use tempProfilePicPreview (which could be a data URI from new upload, or existing URL).
    let finalPhotoURL = tempProfilePicPreview;
    if (profilePicFile) {
      // This is where you'd normally call an upload service.
      // For this example, we assume tempProfilePicPreview already holds the data URI from handleFileChange.
      console.warn("[ProfileCard] New profile picture file selected. Using its data URI for Firestore. Cloud upload not implemented in this component directly.");
    }
    
    const profileDataToSave = {
      email: email, // Email is not editable by user, but must be passed
      displayName: tempName.trim(),
      photoURL: finalPhotoURL,
      phoneNumber: initialProfileData?.phoneNumber || null, // Assuming phone isn't edited here
      bio: tempBio.trim() || null,
      onboardingComplete: true, // Must be true
    };

    try {
      await createOrUpdateUserFullProfile(authUid, profileDataToSave);

      // Update persistent local state
      setName(tempName.trim());
      setBio(tempBio.trim() || '');
      setProfilePicPreview(finalPhotoURL);
      setProfilePicFile(null); // Clear staged file

      // Update LocalStorage for immediate app-wide consistency
      setUserProfileLs(prev => {
        if (!prev || prev.uid !== authUid) return prev; // Should not happen if authUid is correct
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
      console.error("Error saving profile:", error);
      toast({ variant: 'destructive', title: "Save Failed", description: error.message || "Could not save profile to server." });
    }
  };

  const handleCancel = () => {
    // Reset temp values from persistent state
    setTempName(name);
    setTempBio(bio);
    setTempProfilePicPreview(profilePicPreview);
    setProfilePicFile(null); // Clear any new file selection
    setIsEditing(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfilePicFile(file); // Stage the file
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempProfilePicPreview(reader.result as string); // Update temp preview for editing UI
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
                 <AvatarImage src={displayAvatarSrc} alt="Profile Picture" data-ai-hint="person avatar" />
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
          <Input id="profile-pic-upload-account" type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={!isEditing} />
        </div>
        <CardTitle className="mt-4 text-xl">{isEditing ? tempName : name}</CardTitle>
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
            />
          ) : (
            <p className="mt-1 text-foreground min-h-[2.5rem] flex items-center px-3 py-2 rounded-md border border-transparent"> {/* Match input height */}
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
            />
          ) : (
             <p className="mt-1 text-foreground whitespace-pre-line min-h-[5rem] px-3 py-2 rounded-md border border-transparent"> {/* Match textarea min-height */}
              {bio || <span className="text-muted-foreground italic">No bio set.</span>}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {isEditing ? (
          <>
            <Button variant="ghost" onClick={handleCancel}>
              <X className="mr-1 w-4 h-4" /> Cancel
            </Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-accent to-primary text-primary-foreground hover:opacity-90 transition-opacity">
              <Save className="mr-1 w-4 h-4" /> Save
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
