
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNavigationBar from "@/components/bottom-navigation-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone } from "lucide-react";
import { auth } from '@/lib/firebase';
import type { User as AuthUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function CallsPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(undefined);
  const [authCheckCompleted, setAuthCheckCompleted] = useState(false);
  const [onboardingComplete] = useLocalStorage('onboardingComplete', false);
  const [isGuardLoading, setIsGuardLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthCheckCompleted(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authCheckCompleted) {
      setIsGuardLoading(true);
      return;
    }
    if (!authUser) {
      router.replace('/login');
      return;
    }
    if (!onboardingComplete) {
      router.replace('/profile-setup');
      return;
    }
    setIsGuardLoading(false);
  }, [authCheckCompleted, authUser, onboardingComplete, router]);

  if (isGuardLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-muted-foreground">Loading Calls...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b sticky top-0 bg-background z-10">
        <h1 className="text-xl font-semibold text-gradient-primary-accent">Calls</h1>
      </header>
      
      <main className="flex-grow flex flex-col items-center justify-center p-4 text-center overflow-auto mb-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Phone className="w-16 h-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl font-headline">Calling Feature Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Soon you'll be able to make voice and video calls directly from BharatConnect.
              We're working hard to bring this feature to you!
            </p>
          </CardContent>
        </Card>
      </main>
      
      <BottomNavigationBar />
    </div>
  );
}
