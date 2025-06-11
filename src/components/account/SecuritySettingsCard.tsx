
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, KeyRound, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signOutUser } from '@/lib/firebase';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';

type LoginMethod = "Google" | "Email/Password"; // Assuming Google might be used eventually

export default function SecuritySettingsCard() {
  const { toast } = useToast();
  const router = useRouter();
  const [, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  // Hardcode login method for demonstration, assuming email/password for now.
  // This could be dynamically determined based on Firebase user's providerData in a real app.
  const [loginMethod] = useState<LoginMethod>("Email/Password");
  const [isLoggingOut, setIsLoggingOut] = useState(false);


  const handleChangePassword = () => {
    if (loginMethod === "Email/Password") {
      toast({ title: "Change Password", description: "Password change functionality would be implemented here. For example, by sending a password reset email or navigating to a change password screen." });
      // Example: router.push('/change-password');
      // Or call a Firebase function to send a password reset email if appropriate
      // For instance: resetUserPassword(userEmail).then(...).catch(...);
    } else {
      toast({ title: "Change Password", description: "Password changes for social logins are managed through the provider (e.g., Google)." });
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOutUser();
      setUserProfileLs(null); // Clear local storage profile
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.replace('/login'); // Redirect to login page
    } catch (error: any) {
      console.error("Error logging out from SecuritySettingsCard:", error);
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: error.message || "An unexpected error occurred during logout.",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Card className="rounded-2xl shadow-md bg-card">
      <CardHeader>
        <div className="flex items-center">
          <Lock className="w-5 h-5 mr-2 text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary" />
          <CardTitle className="text-lg">Security</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-muted-foreground">Login Method</Label>
          <div className="flex items-center mt-1 p-2 rounded-md bg-muted/30">
            {loginMethod === "Google" ? (
              <ShieldCheck className="w-5 h-5 mr-2 text-green-500" />
            ) : (
              <ShieldCheck className="w-5 h-5 mr-2 text-primary" /> // Using primary for Email/Pass
            )}
            <p className="text-foreground">{loginMethod}</p>
          </div>
        </div>
        <Button
          onClick={handleChangePassword}
          disabled={loginMethod === "Google" || isLoggingOut}
          className="w-full justify-start"
          variant="outline"
        >
          <KeyRound className="w-4 h-4 mr-2" />
          Change Password
        </Button>
        {loginMethod === "Google" && (
          <p className="text-xs text-muted-foreground -mt-4 ml-1">
            Password changes are managed through your Google account.
          </p>
        )}
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full bg-destructive/80 hover:bg-destructive text-destructive-foreground justify-start"
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Logging out...
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
