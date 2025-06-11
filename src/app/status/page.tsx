
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNavigationBar from "@/components/bottom-navigation-bar";
import PageHeader from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import StatusListItem from '@/components/status-list-item';
import { mockCurrentUser, mockUsers, mockStatusUpdates } from '@/lib/mock-data';
import type { StatusUpdate, User as BharatConnectUser, LocalUserProfile } from '@/types';
import { QrCode, Search, MoreVertical, PlusCircle, Pencil, Camera, UserCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import SwipeablePageWrapper from '@/components/shared/SwipeablePageWrapper';
import { cn } from '@/lib/utils';


interface StatusUpdateWithUser extends StatusUpdate {
  user: BharatConnectUser;
}

export default function StatusPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [userProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  const [currentUserAuraIdLs] = useLocalStorage<string | null>('currentUserAuraId', null);
  const [isGuardLoading, setIsGuardLoading] = useState(true);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [myUser, setMyUser] = useState<BharatConnectUser | null>(null);
  const [recentStatusUpdates, setRecentStatusUpdates] = useState<StatusUpdateWithUser[]>([]);
  const [currentUserHasImageStatus, setCurrentUserHasImageStatus] = useState(false);


  useEffect(() => {
    if (!userProfileLs || !userProfileLs.uid || !userProfileLs.onboardingComplete) {
      console.log(`[StatusPage] User from LS not found or not fully onboarded. Redirecting to login.`);
      router.replace('/login');
      return;
    }
    setIsGuardLoading(false);
  }, [userProfileLs, router]);

  useEffect(() => {
    if (isGuardLoading) return;

    setIsPageLoading(true);
    setTimeout(() => {
      const currentAppUser = userProfileLs ? {
        ...mockCurrentUser,
        id: userProfileLs.uid,
        name: userProfileLs.displayName || 'You',
        avatarUrl: userProfileLs.photoURL || undefined,
        currentAuraId: currentUserAuraIdLs,
      } : { ...mockCurrentUser, currentAuraId: currentUserAuraIdLs };
      setMyUser(currentAppUser);

      const latestUserStatus = mockStatusUpdates
        .filter(s => s.userId === currentAppUser.id)
        .sort((a,b) => b.timestamp - a.timestamp)[0];
      setCurrentUserHasImageStatus(!!(latestUserStatus && latestUserStatus.imageUrl));

      const updatesWithUsers = mockStatusUpdates
        .map(status => {
          const user = mockUsers.find(u => u.id === status.userId);
          return user ? { ...status, user } : null;
        })
        .filter((item): item is StatusUpdateWithUser => item !== null)
        .sort((a, b) => b.timestamp - a.timestamp);

      setRecentStatusUpdates(updatesWithUsers);
      setIsPageLoading(false);
    }, 1000);
  }, [isGuardLoading, userProfileLs, currentUserAuraIdLs]);

  const showComingSoonToast = () => {
    toast({
      title: "Hold Tight, Connecting Soon! 🚀",
      description: "Our team is busy crafting this awesome feature for you. It'll be ready before your next chai break! Stay tuned with BharatConnect! 🇮🇳✨",
    });
  };

  const handleAddStatus = () => {
    showComingSoonToast();
  };

  const headerActions = (
    <>
      <Button variant="ghost" size="icon" aria-label="Scan QR code" onClick={showComingSoonToast}>
        <QrCode className="w-5 h-5" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Search statuses" onClick={showComingSoonToast}>
        <Search className="w-5 h-5" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="More options" onClick={showComingSoonToast}>
        <MoreVertical className="w-5 h-5" />
      </Button>
    </>
  );

  if (isGuardLoading || isPageLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background">
         <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-muted-foreground">Loading Status...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader title="Status" actions={headerActions} />
      <SwipeablePageWrapper className="flex-grow overflow-hidden">
        <main className="h-full overflow-y-auto mb-16 hide-scrollbar">
          <div className="p-3">
            <div
              className="flex items-center space-x-3 py-3 cursor-pointer hover:bg-muted/30 rounded-lg"
              onClick={handleAddStatus}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAddStatus()}
              aria-label="Add new status"
            >
              <div className="relative">
                <Avatar className="w-14 h-14">
                  {myUser?.avatarUrl ? (
                    <AvatarImage src={myUser.avatarUrl} alt={myUser.name || 'User'} data-ai-hint="person avatar" />
                  ) : (
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <UserCircle2 className="w-10 h-10" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className={cn(
                  "absolute bottom-0 right-0 rounded-full w-6 h-6 flex items-center justify-center border-2 border-background transform translate-x-1/4 translate-y-1/4",
                  currentUserHasImageStatus ? "bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--primary))] text-accent-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <PlusCircle className={cn("w-3 h-3", currentUserHasImageStatus ? "text-accent-foreground" : "text-muted-foreground")} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">My status</h3>
                <p className="text-xs text-muted-foreground">Add to my status</p>
              </div>
            </div>

            {recentStatusUpdates.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-muted-foreground px-1 mb-1">Recent updates</h4>
                <div className="space-y-px">
                  {recentStatusUpdates.map((status) => (
                    <StatusListItem
                      key={status.id}
                      statusUpdate={status}
                      user={status.user}
                      onClick={showComingSoonToast}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </SwipeablePageWrapper>

      <div className="fixed bottom-20 right-4 space-y-3 z-20">
         <Button
          variant="secondary"
          size="icon"
          className="rounded-full w-12 h-12 shadow-lg bg-card hover:bg-card/80"
          aria-label="New text status"
          onClick={showComingSoonToast}
        >
          <Pencil className="w-5 h-5" />
        </Button>
        <Button
          variant="default"
          size="icon"
          className="rounded-full w-14 h-14 shadow-xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--primary))] text-primary-foreground hover:opacity-90 transition-opacity"
          aria-label="New camera status"
          onClick={showComingSoonToast}
        >
          <Camera className="w-6 h-6" />
        </Button>
      </div>

      <BottomNavigationBar />
    </div>
  );
}
