
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
import type { BharatConnectFirestoreUser } from '@/services/profileService';
import { getUserFullProfile } from '@/services/profileService';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import SwipeablePageWrapper from '@/components/shared/SwipeablePageWrapper';


export default function AccountPage() {
  const router = useRouter();
  const [userProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  
  const [isGuardLoading, setIsGuardLoading] = useState(true);
  const [isFetchingFirestore, setIsFetchingFirestore] = useState(true);
  const [firestoreProfile, setFirestoreProfile] = useState<BharatConnectFirestoreUser | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    // This effect handles initial authentication and onboarding status check from local storage.
    setIsGuardLoading(true);
    setFetchError(null);

    if (!userProfileLs || !userProfileLs.uid) {
      console.log("[AccountPage] No user profile in LS or no UID. Redirecting to /login.");
      router.replace('/login');
      return; 
    }
    if (!userProfileLs.onboardingComplete) {
      console.log("[AccountPage] User not onboarded (LS). Redirecting to /profile-setup.");
      router.replace('/profile-setup');
      return; 
    }
    // If local storage checks pass, guard loading is done.
    setIsGuardLoading(false);
  }, [userProfileLs, router]);

  useEffect(() => {
    // This effect fetches the full profile from Firestore once the initial guard passes.
    if (isGuardLoading || !userProfileLs?.uid || !userProfileLs?.onboardingComplete) {
      // Don't fetch if guard is still loading, or if basic conditions aren't met.
      if (!isGuardLoading && userProfileLs?.uid && !userProfileLs?.onboardingComplete) {
        // This case should ideally be caught by the first useEffect, but as a safeguard.
        console.log("[AccountPage] Firestore fetch skipped: User not onboarded.");
      }
      return;
    }

    let isMounted = true;
    setIsFetchingFirestore(true);
    setFetchError(null);

    console.log(`[AccountPage] Attempting to fetch Firestore profile for UID: ${userProfileLs.uid}`);
    getUserFullProfile(userProfileLs.uid)
      .then(profile => {
        if (!isMounted) return;
        if (profile) {
          console.log("[AccountPage] Firestore profile fetched successfully:", profile);
          setFirestoreProfile(profile);
        } else {
          console.warn(`[AccountPage] Firestore profile not found for onboarded user UID: ${userProfileLs.uid}. This is unexpected.`);
          setFetchError("Your profile data could not be loaded from the server. Some information might be missing or you might need to complete your profile again.");
          // Potentially redirect to /profile-setup or show an error state.
          // For now, ProfileCard will handle null and show fallbacks.
        }
      })
      .catch(error => {
        if (!isMounted) return;
        console.error("[AccountPage] Error fetching Firestore profile:", error);
        setFetchError("An error occurred while fetching your profile. Please try again later.");
      })
      .finally(() => {
        if (isMounted) {
          setIsFetchingFirestore(false);
        }
      });
    
    return () => {
      isMounted = false;
    };
  }, [isGuardLoading, userProfileLs]); // Depends on guard and userProfileLs (specifically uid)

  if (isGuardLoading || isFetchingFirestore) {
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
      <SwipeablePageWrapper className="flex-grow overflow-hidden">
        <main className="h-full overflow-y-auto pb-20 pt-4 px-4 space-y-6 hide-scrollbar">
          {fetchError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Profile</AlertTitle>
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}
          <ProfileCard 
            initialProfileData={firestoreProfile} 
            authUid={userProfileLs?.uid || null} 
          />
          <PrivacySettingsCard />
          <ThemeSettingsCard />
          <LanguageSettingsCard />
          <SecuritySettingsCard />
          <LinkedAppsCard />
          <AdvancedOptionsCard />
        </main>
      </SwipeablePageWrapper>
      <BottomNavigationBar />
    </div>
  );
}
