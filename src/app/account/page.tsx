
"use client";

import BottomNavigationBar from "@/components/bottom-navigation-bar";
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle2 } from "lucide-react";

export default function AccountPage() {
  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="My Account" showBackButton={false} />
      
      <main className="flex-grow flex flex-col items-center justify-center p-4 text-center overflow-auto mb-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <UserCircle2 className="w-16 h-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl font-headline">Account Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This is where you'll manage your profile, settings, and preferences.
              This feature is coming soon!
            </p>
          </CardContent>
        </Card>
      </main>
      
      <BottomNavigationBar />
    </div>
  );
}
