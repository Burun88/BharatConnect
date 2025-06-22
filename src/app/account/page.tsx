
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNavigationBar from "@/components/bottom-navigation-bar";
import PageHeader from "@/components/page-header";
import ProfileCard from "@/components/account/ProfileCard";
import ConnectionsCard from "@/components/account/ConnectionsCard"; // Import new card
import PrivacySettingsCard from "@/components/account/PrivacySettingsCard";
import ThemeSettingsCard from "@/components/account/ThemeSettingsCard";
import LanguageSettingsCard from "@/components/account/LanguageSettingsCard";
import SecuritySettingsCard from "@/components/account/SecuritySettingsCard";
import LinkedAppsCard from "@/components/account/LinkedAppsCard";
import AdvancedOptionsCard from "@/components/account/AdvancedOptionsCard";
import ChatBackupCard from '@/components/account/ChatBackupCard'; // Import the new backup card
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types'; // Changed from BharatConnectFirestoreUser
import { getUserFullProfile } from '@/services/profileService';
import { AlertCircle, Loader2 } from 'lucide-react'; // Import Loader2
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import SwipeablePageWrapper from '@/components/shared/SwipeablePageWrapper';


export default function AccountPage() {
  const router = useRouter();
  const { authUser, isAuthenticated, isAuthLoading } = useAuth();
  
  const [isFetchingFirestore, setIsFetchingFirestore] = useState(true);
  const [firestoreProfile, setFirestoreProfile] = useState<User | null>(null); // Changed type to User
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      return; 
    }
    if (!isAuthenticated || !authUser) {
      console.log("[AccountPage] Not authenticated, AuthContext should redirect.");
      setIsFetchingFirestore(false);
      return;
    }

    let isMounted = true;
    setIsFetchingFirestore(true);
    setFetchError(null);

    console.log(`[AccountPage] Authenticated. Attempting to fetch Firestore profile for UID: ${authUser.id}`);
    getUserFullProfile(authUser.id) // This returns User | null
      .then(profile => {
        if (!isMounted) return;
        if (profile) {
          console.log("[AccountPage] Firestore profile fetched successfully:", profile);
          setFirestoreProfile(profile); // profile is User | null
        } else {
          console.warn(`[AccountPage] Firestore profile not found for UID: ${authUser.id}. This might be an issue if onboarding was expected.`);
          setFetchError("Your detailed profile data could not be loaded from the server. Some information might be based on initial login data.");
          // Create a User object for fallback
          setFirestoreProfile({
            id: authUser.id,
            email: authUser.email || '',
            username: authUser.username || '',
            name: authUser.name || 'User', 
            avatarUrl: authUser.avatarUrl || null,
            onboardingComplete: authUser.onboardingComplete,
            phone: authUser.phone || undefined,
            bio: authUser.bio || undefined,
            status: authUser.status || undefined,
            hasViewedStatus: authUser.hasViewedStatus || false,
          });
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
  }, [isAuthLoading, isAuthenticated, authUser, router]); 

  if (isAuthLoading || (isAuthenticated && isFetchingFirestore)) {
    return (
      <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-muted-foreground text-center">Loading Account...</p>
      </div>
    );
  }

  if (!isAuthenticated && !isAuthLoading) {
    return (
         <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
            <p className="text-muted-foreground text-center">Redirecting...</p>
         </div>
    );
  }
  
  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
      <PageHeader title="Account Centre" showBackButton={false} />
      <SwipeablePageWrapper className="flex-grow overflow-hidden">
        <main className="h-full overflow-y-auto pb-20 pt-4 px-4 space-y-6 hide-scrollbar">
          {fetchError && !firestoreProfile && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Profile</AlertTitle>
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}
          <ProfileCard 
            initialProfileData={firestoreProfile} 
            authUid={authUser?.id || null} 
          />
          <ConnectionsCard />
          <ChatBackupCard />
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
