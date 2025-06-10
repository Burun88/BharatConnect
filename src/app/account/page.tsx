
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNavigationBar from "@/components/bottom-navigation-bar";
import PageHeader from "@/components/page-header";
import ProfileCard from "@/components/account/ProfileCard";
import PrivacySettingsCard from "@/components/account/PrivacySettingsCard";
import ThemeSettingsCard from "@/components/account/ThemeSettingsCard";
import LanguageSettingsCard from "@/components/account/LanguageSettingsCard";
import SecuritySettingsCard from "@/components/account/SecuritySettingsCard";
import LinkedAppsCard from "@/components/account/LinkedAppsCard";
import AdvancedOptionsCard from "@/components/account/AdvancedOptionsCard";
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';

export default function AccountPage() {
  const router = useRouter();
  const [userProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  const [onboardingComplete] = useLocalStorage('onboardingComplete', userProfileLs?.onboardingComplete || false); // Use value from LS or default
  const [isGuardLoading, setIsGuardLoading] = useState(true);

  useEffect(() => {
    // Simplified guard logic as Firebase auth is removed
    setIsGuardLoading(true);
    if (!userProfileLs || !userProfileLs.uid ) {
      router.replace('/login');
      return;
    }
    if (!onboardingComplete && userProfileLs.uid) { // Check onboarding if UID exists
      router.replace('/profile-setup');
      return;
    }
    setIsGuardLoading(false); 
  }, [userProfileLs, onboardingComplete, router]);

  if (isGuardLoading) {
    return (
      <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-muted-foreground">Loading Account...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
      <PageHeader title="Account Centre" showBackButton={false} />
      
      <main className="flex-grow overflow-y-auto pb-20 pt-4 px-4 space-y-6 hide-scrollbar">
        <ProfileCard />
        <PrivacySettingsCard />
        <ThemeSettingsCard />
        <LanguageSettingsCard />
        <SecuritySettingsCard />
        <LinkedAppsCard />
        <AdvancedOptionsCard />
      </main>
      
      <BottomNavigationBar />
    </div>
  );
}
