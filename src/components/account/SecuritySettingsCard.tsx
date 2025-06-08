
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, KeyRound, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type LoginMethod = "Google" | "Email/Password";

export default function SecuritySettingsCard() {
  const { toast } = useToast();
  // Hardcode login method for demonstration
  const [loginMethod] = useState<LoginMethod>("Google"); 

  const handleChangePassword = () => {
    toast({ title: "Change Password", description: "Password change screen would appear here." });
  };

  const handleLogout = () => {
    toast({ title: "Logged Out", description: "You have been successfully logged out (simulated)." });
    // In a real app, you'd redirect or clear session here
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
              <ShieldAlert className="w-5 h-5 mr-2 text-yellow-500" />
            )}
            <p className="text-foreground">{loginMethod}</p>
          </div>
        </div>
        <Button
          onClick={handleChangePassword}
          disabled={loginMethod === "Google"}
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
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </CardContent>
    </Card>
  );
}
