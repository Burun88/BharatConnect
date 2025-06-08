
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AppWindow, Link2 } from 'lucide-react'; // Using Link2 for main icon

interface AppLink {
  id: string;
  name: string;
  icon: React.ElementType;
  profileShown: boolean;
}

export default function LinkedAppsCard() {
  const [linkedApps, setLinkedApps] = useState<AppLink[]>([
    { id: 'instabharat', name: 'InstaBharat', icon: AppWindow, profileShown: true },
    { id: 'bharatconnect', name: 'BharatConnect', icon: AppWindow, profileShown: true },
  ]);

  const handleToggle = (appId: string) => {
    setLinkedApps(prevApps =>
      prevApps.map(app =>
        app.id === appId ? { ...app, profileShown: !app.profileShown } : app
      )
    );
  };

  return (
    <Card className="rounded-2xl shadow-md bg-card">
      <CardHeader>
        <div className="flex items-center">
          <Link2 className="w-5 h-5 mr-2 text-primary" />
          <CardTitle className="text-lg">Linked Apps</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedApps.map(app => {
          const AppIcon = app.icon;
          return (
            <div key={app.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center">
                <AppIcon className="w-6 h-6 mr-3 text-primary" />
                <span className="text-sm text-foreground">{app.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor={`switch-${app.id}`} className="text-xs text-muted-foreground sr-only">
                  Show my profile in {app.name}
                </Label>
                <Switch
                  id={`switch-${app.id}`}
                  checked={app.profileShown}
                  onCheckedChange={() => handleToggle(app.id)}
                  aria-label={`Toggle profile visibility for ${app.name}`}
                />
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground pt-2">
          Control whether your BharatConnect profile information (like name and picture) is visible within these linked applications.
        </p>
      </CardContent>
    </Card>
  );
}
