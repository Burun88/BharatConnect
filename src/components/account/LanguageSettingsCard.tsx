
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Languages } from 'lucide-react';

type LanguageOption = "English" | "Hindi" | "Bengali" | "Tamil" | "Telugu";

export default function LanguageSettingsCard() {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>("English");
  const languageOptions: LanguageOption[] = ["English", "Hindi", "Bengali", "Tamil", "Telugu"];

  return (
    <Card className="rounded-2xl shadow-md bg-card">
      <CardHeader>
        <div className="flex items-center">
          <Languages className="w-5 h-5 mr-2 text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary" />
          <CardTitle className="text-lg">Language</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Label htmlFor="language-selector">Select App Language</Label>
        <Select value={selectedLanguage} onValueChange={(value: LanguageOption) => setSelectedLanguage(value)}>
          <SelectTrigger id="language-selector" className="w-full mt-1 bg-input">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map(option => (
              <SelectItem key={option} value={option}>
                {option} {option === "English" && "(Default)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
         <p className="text-xs text-muted-foreground mt-2">
          Note: This is a UI demonstration. Language switching is not implemented.
        </p>
      </CardContent>
    </Card>
  );
}
