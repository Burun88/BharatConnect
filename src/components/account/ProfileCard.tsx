
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle2, Edit3, Save, X, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ProfileCard() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("Chai Wala");
  const [tempName, setTempName] = useState(name);
  const [bio, setBio] = useState("Brewing the best chai in town! ☕️\nLoves coding and connecting with people.");
  const [tempBio, setTempBio] = useState(bio);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const email = "chai.wala@example.com"; // Hardcoded email

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset temp values if canceling
      setTempName(name);
      setTempBio(bio);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    setName(tempName);
    setBio(tempBio);
    setIsEditing(false);
    toast({ title: "Profile Updated", description: "Your changes have been saved." });
  };

  const handleCancel = () => {
    setTempName(name);
    setTempBio(bio);
    setIsEditing(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast({ title: "Profile picture selected", description: "Looking good!" });
    }
  };

  return (
    <Card className="rounded-2xl shadow-md bg-card">
      <CardHeader className="items-center text-center">
        <div className="relative">
          <div className="p-1 rounded-full bg-gradient-to-br from-primary to-accent">
            <Avatar className="w-[100px] h-[100px] border-2 border-background"> {/* Added border-background for inset look */}
              <AvatarImage src={profilePicPreview || undefined} alt="Profile Picture" data-ai-hint="ai avatar" />
              <AvatarFallback className="bg-muted">
                <UserCircle2 className="w-16 h-16 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="absolute bottom-1 right-1 rounded-full w-8 h-8 bg-muted hover:bg-muted/80 border-background border-2" // Adjusted position and added border
            onClick={() => document.getElementById('profile-pic-upload-account')?.click()}
            aria-label="Change profile picture"
          >
            <Camera className="w-4 h-4" />
          </Button>
          <Input id="profile-pic-upload-account" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
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
            <p className="mt-1 text-foreground">{name}</p>
          )}
        </div>
        <div>
          <Label htmlFor="email-account" className="text-muted-foreground">Email</Label>
          <Input
            id="email-account"
            value={email}
            readOnly
            className="mt-1 bg-muted/50 border-muted/30 text-muted-foreground cursor-not-allowed"
          />
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
            <p className="mt-1 text-foreground whitespace-pre-line">{bio || "No bio set."}</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {isEditing ? (
          <>
            <Button variant="ghost" onClick={handleCancel}>
              <X className="mr-2" /> Cancel
            </Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-accent to-primary text-primary-foreground hover:opacity-90 transition-opacity">
              <Save className="mr-2" /> Save
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={handleEditToggle}>
            <Edit3 className="mr-2" /> Edit Profile
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
