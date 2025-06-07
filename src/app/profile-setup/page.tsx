"use client";

import { useState, type FormEvent, type ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle2, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function ProfileSetupPage() {
  const [name, setName] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useLocalStorage('userProfile', { phone: '', name: '' });
  const [, setOnboardingComplete] = useLocalStorage('onboardingComplete', false);
  const [appOnboardingComplete, ] = useLocalStorage('onboardingComplete', false);

  useEffect(() => {
    if (appOnboardingComplete) {
      router.replace('/');
    }
  }, [appOnboardingComplete, router]);


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // In a real app, you would upload this file to a server.
      // For now, we just show a preview. Profile pictures are not displayed elsewhere.
      toast({ title: "Profile picture selected", description: "It won't be displayed in the app yet."});
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    
    setUserProfile(prev => ({ ...prev, name: name.trim() }));
    setOnboardingComplete(true);
    
    toast({
      title: 'Profile Saved!',
      description: `Welcome, ${name.trim()}!`,
    });
    router.push('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
             <UserCircle2 className="w-16 h-16 text-gradient-primary-accent" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-gradient-primary-accent">
            Setup Your Profile
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Let others know who you are.
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
              <p className="text-xs text-muted-foreground">Tap to upload a profile picture (optional)</p>
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
              />
              {error && <p id="name-error" className="text-sm text-destructive">{error}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity">
              Save Profile & Continue
            </Button>
          </CardFooter>
        </form>
      </Card>
       <Button variant="link" className="mt-4 text-sm text-muted-foreground" onClick={() => router.back()}>
        Back
      </Button>
    </div>
  );
}
