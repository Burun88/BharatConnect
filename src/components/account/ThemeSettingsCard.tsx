
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Sun, Moon, Laptop } from 'lucide-react';

type ThemeOption = "light" | "dark" | "system";

export default function ThemeSettingsCard() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>("dark"); // Default to dark as per app's current theme

  return (
    <Card className="rounded-2xl shadow-md bg-card">
      <CardHeader>
         <div className="flex items-center">
          {selectedTheme === 'light' && <Sun className="w-5 h-5 mr-2 text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary" />}
          {selectedTheme === 'dark' && <Moon className="w-5 h-5 mr-2 text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary" />}
          {selectedTheme === 'system' && <Laptop className="w-5 h-5 mr-2 text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary" />}
          <CardTitle className="text-lg">App Theme</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Label htmlFor="theme-selector" className="mb-2 block">Select Theme</Label>
        <ToggleGroup
          id="theme-selector"
          type="single"
          value={selectedTheme}
          onValueChange={(value: ThemeOption) => {
            if (value) setSelectedTheme(value);
          }}
          className="grid grid-cols-3 gap-2"
          aria-label="Theme selection"
        >
          <ToggleGroupItem value="light" aria-label="Light theme" className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-accent data-[state=on]:to-primary data-[state=on]:text-primary-foreground">
            <Sun className="w-4 h-4 mr-2" /> Light
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" aria-label="Dark theme" className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-accent data-[state=on]:to-primary data-[state=on]:text-primary-foreground">
            <Moon className="w-4 h-4 mr-2" /> Dark
          </ToggleGroupItem>
          <ToggleGroupItem value="system" aria-label="System default theme" className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-accent data-[state=on]:to-primary data-[state=on]:text-primary-foreground">
            <Laptop className="w-4 h-4 mr-2" /> System
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs text-muted-foreground mt-2">
          Note: This is a UI demonstration. Theme switching is not implemented.
        </p>
      </CardContent>
    </Card>
  );
}
