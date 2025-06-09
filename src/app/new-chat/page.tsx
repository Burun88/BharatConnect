
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquarePlus } from "lucide-react";
import { auth } from '@/lib/firebase';
import type { User as AuthUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function NewChatPage() {
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
        <p className="mt-4 text-muted-foreground">Loading New Chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Start New Chat" />
      <main className="flex-grow p-6 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <MessageSquarePlus className="w-16 h-16 text-primary" />
            </div>
            <CardTitle className="text-2xl font-headline">New Chat Feature</CardTitle>
            <CardDescription className="text-muted-foreground">
              This section will allow you to start new conversations with your contacts or create new groups.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Currently, this feature is under development. Please check back later!
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              <Users className="mr-2 h-4 w-4" /> View Existing Chats
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
