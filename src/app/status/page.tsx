"use client";

import BottomNavigationBar from "@/components/bottom-navigation-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleDot } from "lucide-react";

export default function StatusPage() {
  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b sticky top-0 bg-background z-10">
        <h1 className="text-xl font-semibold text-gradient-primary-accent">Status</h1>
      </header>
      
      <main className="flex-grow flex flex-col items-center justify-center p-4 text-center overflow-auto mb-16"> {/* Added mb-16 for bottom nav */}
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CircleDot className="w-16 h-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl font-headline">Status Feature Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This section will allow you to share and view status updates from your contacts. 
              Stay tuned for exciting updates!
            </p>
          </CardContent>
        </Card>
      </main>
      
      <BottomNavigationBar />
    </div>
  );
}
