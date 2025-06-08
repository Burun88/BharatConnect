
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Eye, Users, Globe } from 'lucide-react';

type VisibilityOption = "Everyone" | "My Contacts" | "Nobody";

export default function PrivacySettingsCard() {
  const [lastSeen, setLastSeen] = useState<VisibilityOption>("My Contacts");
  const [profileVisibility, setProfileVisibility] = useState<VisibilityOption>("My Contacts");

  const visibilityOptions: VisibilityOption[] = ["Everyone", "My Contacts", "Nobody"];

  const getIconForOption = (option: VisibilityOption) => {
    switch (option) {
      case "Everyone": return <Globe className="w-4 h-4 mr-2 text-muted-foreground" />;
      case "My Contacts": return <Users className="w-4 h-4 mr-2 text-muted-foreground" />;
      case "Nobody": return <Eye className="w-4 h-4 mr-2 text-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <Card className="rounded-2xl shadow-md bg-card">
      <CardHeader>
        <div className="flex items-center">
          <Shield className="w-5 h-5 mr-2 text-primary" />
          <CardTitle className="text-lg">Privacy Settings</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="last-seen">Last Seen Visibility</Label>
          <Select value={lastSeen} onValueChange={(value: VisibilityOption) => setLastSeen(value)}>
            <SelectTrigger id="last-seen" className="w-full bg-input">
              {/* Icon removed from here, SelectValue will now be the direct child */}
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              {visibilityOptions.map(option => (
                <SelectItem key={option} value={option}>
                  <div className="flex items-center">
                    {getIconForOption(option)} {/* Icons still shown in the dropdown list itself */}
                    {option}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-visibility">Profile Picture Visibility</Label>
          <Select value={profileVisibility} onValueChange={(value: VisibilityOption) => setProfileVisibility(value)}>
            <SelectTrigger id="profile-visibility" className="w-full bg-input">
               {/* Icon removed from here, SelectValue will now be the direct child */}
               <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              {visibilityOptions.map(option => (
                <SelectItem key={option} value={option}>
                  <div className="flex items-center">
                    {getIconForOption(option)} {/* Icons still shown in the dropdown list itself */}
                    {option}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
