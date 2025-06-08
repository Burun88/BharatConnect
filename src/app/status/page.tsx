
"use client";

import { useState, useEffect } from 'react';
import BottomNavigationBar from "@/components/bottom-navigation-bar";
import PageHeader from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import StatusListItem from '@/components/status-list-item';
import { mockCurrentUser, mockUsers, mockStatusUpdates } from '@/lib/mock-data';
import type { StatusUpdate, User } from '@/types';
import { QrCode, Search, MoreVertical, PlusCircle, Pencil, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface StatusUpdateWithUser extends StatusUpdate {
  user: User;
}

export default function StatusPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [myUser, setMyUser] = useState<User | null>(null);
  const [recentStatusUpdates, setRecentStatusUpdates] = useState<StatusUpdateWithUser[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate data fetching
    setTimeout(() => {
      setMyUser(mockCurrentUser);

      const updatesWithUsers = mockStatusUpdates
        .map(status => {
          const user = mockUsers.find(u => u.id === status.userId);
          return user ? { ...status, user } : null;
        })
        .filter((item): item is StatusUpdateWithUser => item !== null)
        .sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent

      setRecentStatusUpdates(updatesWithUsers);
      setIsLoading(false);
    }, 1000);
  }, []);

  const showComingSoonToast = () => {
    toast({
      title: "Hold Tight, Connecting Soon! 🚀",
      description: "Our team is busy crafting this awesome feature for you. It'll be ready before your next chai break! Stay tuned with BharatConnect! 🇮🇳✨",
    });
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader title="Status" actions={headerActions} />
        <main className="flex-grow p-4 overflow-auto mb-16 space-y-6">
          {/* My Status Skeleton */}
          <div className="flex items-center space-x-3">
            <Skeleton className="w-14 h-14 rounded-full" /> {/* Adjusted to match increased size */}
            <div className="space-y-1.5">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-32 h-3" />
            </div>
          </div>
          {/* Recent Updates Skeleton */}
          <div>
            <Skeleton className="w-28 h-4 mb-3" />
            <div className="space-y-px"> {/* Reduced gap for skeleton items */}
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3"> {/* Added p-3 to match StatusListItem's padding */}
                  <Skeleton className="w-14 h-14 rounded-full" /> {/* Adjusted to match increased size */}
                  <div className="flex-1 min-w-0">
                    <Skeleton className="w-32 h-4 mb-1.5" /> {/* Adjusted for consistency */}
                    <Skeleton className="w-20 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <BottomNavigationBar />
      </div>
    );
  }


  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader title="Status" actions={headerActions} />
      
      <main className="flex-grow overflow-y-auto mb-16 hide-scrollbar">
        <div className="p-3">
          {/* My Status Section */}
          <div
            className="flex items-center space-x-3 py-3 cursor-pointer hover:bg-muted/30 rounded-lg"
            onClick={handleAddStatus}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAddStatus()}
            aria-label="Add new status"
          >
            <div className="relative">
              <Avatar className="w-14 h-14"> {/* Increased size */}
                {myUser?.avatarUrl && (
                  <AvatarImage src={myUser.avatarUrl} alt={myUser.name} data-ai-hint="person avatar" />
                )}
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {myUser ? getInitials(myUser.name) : '??'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--accent-dimmed))] text-accent-foreground rounded-full w-7 h-7 flex items-center justify-center border-2 border-background transform translate-x-1/4 translate-y-1/4">
                <PlusCircle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">My status</h3>
              <p className="text-xs text-muted-foreground">Add to my status</p>
            </div>
          </div>

          {/* Recent Updates Section */}
          {recentStatusUpdates.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-muted-foreground px-1 mb-1">Recent updates</h4>
              <div className="space-y-px"> {/* Further reduced space between items */}
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

            {/* Muted Updates Section (Placeholder) */}
            {/* You can add similar logic for muted updates if needed */}
            {/* <div className="mt-6">
              <h4 className="text-xs font-medium text-muted-foreground px-1 mb-1">Muted updates</h4>
               Placeholder for muted updates list 
            </div> */}
        </div>
      </main>
      
      {/* Floating Action Buttons */}
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
          className="rounded-full w-14 h-14 shadow-xl bg-primary hover:bg-primary/90"
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

