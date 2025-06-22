
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BottomNavigationBar from "@/components/bottom-navigation-bar";
import PageHeader from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import StatusListItem from '@/components/status-list-item';
import type { StatusUpdate, User as BharatConnectUser, UserStatusDoc } from '@/types';
import { PlusCircle, Pencil, Camera, UserCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useChat as useChatContextHook } from '@/contexts/ChatContext';
import SwipeablePageWrapper from '@/components/shared/SwipeablePageWrapper';
import { cn } from '@/lib/utils';
import { firestore, Timestamp } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getUserFullProfile } from '@/services/profileService';

interface ContactWithStatus {
  userProfile: BharatConnectUser;
  statusDoc: UserStatusDoc | null;
  isViewedByCurrentUser: boolean;
  lastMediaTimestamp?: number;
}

export default function StatusPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { authUser, isAuthenticated, isAuthLoading } = useAuth();
  const { chats: contextChats, isLoadingChats: isContextChatsLoadingFromHook } = useChatContextHook();

  const [isLocallyLoadingChats, setIsLocallyLoadingChats] = useState(true);

  const [currentUserStatusDoc, setCurrentUserStatusDoc] = useState<UserStatusDoc | null>(null);
  const [currentUserHasActiveStatus, setCurrentUserHasActiveStatus] = useState(false);
  const [isOwnStatusViewedByCurrentUser, setIsOwnStatusViewedByCurrentUser] = useState(false);
  const [isLoadingCurrentUserStatus, setIsLoadingCurrentUserStatus] = useState(true);

  const [contactStatuses, setContactStatuses] = useState<ContactWithStatus[]>([]);
  const [isLoadingContactStatuses, setIsLoadingContactStatuses] = useState(true);
  const [isFetchingOwnContacts, setIsFetchingOwnContacts] = useState(false);


  useEffect(() => {
    if (!isContextChatsLoadingFromHook) {
      setIsLocallyLoadingChats(false);
      return;
    }
    let timerId: NodeJS.Timeout | null = null;
    if (isAuthenticated && !isAuthLoading && isContextChatsLoadingFromHook) {
      timerId = setTimeout(() => {
        console.warn("[StatusPage] Timeout: Assuming ChatContext won't load (direct refresh). Proceeding with empty chats.");
        setIsLocallyLoadingChats(false);
      }, 2500);
    }
    return () => { if (timerId) clearTimeout(timerId); };
  }, [isAuthenticated, isAuthLoading, isContextChatsLoadingFromHook]);

  useEffect(() => {
    if (!authUser?.id) {
      setIsLoadingCurrentUserStatus(false);
      setCurrentUserStatusDoc(null);
      setCurrentUserHasActiveStatus(false);
      setIsOwnStatusViewedByCurrentUser(false);
      return;
    }
    let unmounted = false;
    setIsLoadingCurrentUserStatus(true);
    console.log(`[StatusPage] Setting up listener for current user's status: status/${authUser.id}`);
    const statusDocRef = doc(firestore, 'status', authUser.id);
    const unsubscribe = onSnapshot(statusDocRef, (docSnap) => {
      if (unmounted) return;
      console.log(`[StatusPage] Current user status snapshot received. Exists: ${docSnap.exists()}`);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserStatusDoc;
        const isActiveNow = data.isActive === true && data.expiresAt && (data.expiresAt as Timestamp).toMillis() > Date.now() && data.media && data.media.length > 0;
        
        if (isActiveNow) {
          setCurrentUserStatusDoc(data);
          setCurrentUserHasActiveStatus(true);
          
          // Check if EVERY media item has been viewed by the current user.
          // This ensures the ring becomes active again if a new status is added.
          const allItemsViewed = data.media.every(item => item.viewers?.includes(authUser.id!));
          setIsOwnStatusViewedByCurrentUser(allItemsViewed);
          console.log(`[StatusPage] Current user status IS ACTIVE. All items viewed by self: ${allItemsViewed}`);

        } else {
          setCurrentUserStatusDoc(null);
          setCurrentUserHasActiveStatus(false);
          setIsOwnStatusViewedByCurrentUser(false);
          console.log(`[StatusPage] Current user status is INACTIVE or EXPIRED. Data:`, data);
          if (data.isActive === true && (!data.media || data.media.length === 0)) {
            updateDoc(statusDocRef, { isActive: false }).catch(err => console.error("[StatusPage] Error deactivating status doc:", err));
          }
        }
      } else {
        setCurrentUserStatusDoc(null);
        setCurrentUserHasActiveStatus(false);
        setIsOwnStatusViewedByCurrentUser(false);
         console.log(`[StatusPage] Current user status document does NOT exist.`);
      }
      setIsLoadingCurrentUserStatus(false);
    }, (error) => {
      if (unmounted) return;
      console.error("[StatusPage] Error fetching current user's status:", error);
      toast({ variant: "destructive", title: "Status Error", description: "Could not load your status." });
      setCurrentUserStatusDoc(null);
      setCurrentUserHasActiveStatus(false);
      setIsOwnStatusViewedByCurrentUser(false);
      setIsLoadingCurrentUserStatus(false);
    });
    return () => {
      unmounted = true;
      console.log(`[StatusPage] Cleaning up listener for current user's status: status/${authUser.id}`);
      unsubscribe();
    };
  }, [authUser?.id, toast]);

  useEffect(() => {
    const currentAuthUserId = authUser?.id;
    let unmounted = false;
    const unsubscribersMap = new Map<string, () => void>();

    const cleanup = () => {
      unmounted = true;
      unsubscribersMap.forEach(unsub => unsub());
      unsubscribersMap.clear();
      console.log("[StatusPage Contacts] Cleaning up contact status listeners.");
    };

    console.log(`[StatusPage Contacts] BEGIN: Processing contact statuses. isLocallyLoadingChats: ${isLocallyLoadingChats}.`);
    if (isLocallyLoadingChats) {
      console.log("[StatusPage Contacts] Local chat loading state is true. Deferring contact status fetch.");
      setIsLoadingContactStatuses(true);
      return cleanup;
    }

    if (!currentAuthUserId) {
      setContactStatuses([]);
      setIsLoadingContactStatuses(false);
      return cleanup;
    }

    const processContactIds = async (contactIdsToProcess: string[]) => {
      if (unmounted || !currentAuthUserId) return;

      if (contactIdsToProcess.length === 0) {
        console.log("[StatusPage Contacts] No contactUserIds derived. Cleared contact statuses.");
        setContactStatuses([]);
        setIsLoadingContactStatuses(false);
        return;
      }

      console.log(`[StatusPage Contacts] Actively fetching contact statuses for IDs: ${contactIdsToProcess.join(', ')}. Set isLoadingContactStatuses to TRUE.`);
      setIsLoadingContactStatuses(true);

      const initialProcessingPromises = contactIdsToProcess.map(async (contactId) => {
        if (unmounted) return;
        console.log(`[StatusPage Contacts] Setting up listener for contactId: ${contactId}`);
        const userProfile = await getUserFullProfile(contactId);
        if (unmounted || !userProfile) {
          if (!unmounted) setContactStatuses(prev => prev.filter(cs => cs.userProfile.id !== contactId));
          return;
        }
        const statusDocRef = doc(firestore, 'status', contactId);
        const unsubscribe = onSnapshot(statusDocRef, (docSnap) => {
          if (unmounted) return;
          console.log(`[StatusPage Contacts] Snapshot for contact ${contactId}. Exists: ${docSnap.exists()}`);
          let newContactStatusItem: ContactWithStatus | null = null;
          if (docSnap.exists()) {
            const data = docSnap.data() as UserStatusDoc;
            console.log(`[StatusPage Contacts] Contact ${contactId} raw status data:`, data);
            
            const isActiveNow = data.isActive === true && data.expiresAt && (data.expiresAt as Timestamp).toMillis() > Date.now() && data.media && data.media.length > 0;
            if (isActiveNow) {
               // A contact's status is "viewed" if all their media items have been seen by the current user.
               const viewedByCurrentUser = data.media.every(item => item.viewers?.includes(currentAuthUserId!));
               console.log(`[StatusPage Contacts] Contact ${contactId} has active status. All items viewed by current user (${currentAuthUserId!}): ${viewedByCurrentUser}`);
              newContactStatusItem = {
                userProfile,
                statusDoc: data,
                isViewedByCurrentUser: viewedByCurrentUser,
                lastMediaTimestamp: data.lastMediaTimestamp ? (data.lastMediaTimestamp as Timestamp).toMillis() : (data.createdAt as Timestamp).toMillis(),
              };
            } else {
                console.log(`[StatusPage Contacts] Contact ${contactId} status is NOT active or expired.`);
            }
          }
          setContactStatuses(prev => {
            const existingIndex = prev.findIndex(cs => cs.userProfile.id === contactId);
            if (newContactStatusItem) {
              if (existingIndex > -1) { const updated = [...prev]; updated[existingIndex] = newContactStatusItem; return updated; }
              else { return [...prev, newContactStatusItem]; }
            } else { return prev.filter(cs => cs.userProfile.id !== contactId); }
          });
        }, (error) => {
          if (unmounted) return;
          console.error(`[StatusPage Contacts] Error fetching status for contact ${contactId}:`, error);
          setContactStatuses(prev => prev.filter(cs => cs.userProfile.id !== contactId));
        });
        if (!unmounted) unsubscribersMap.set(contactId, unsubscribe);
      });
      Promise.all(initialProcessingPromises)
       .catch(error => { if (!unmounted) console.error("[StatusPage Contacts] Error during initial processing of contact status listeners:", error); })
       .finally(() => {
         if (!unmounted) {
            console.log("[StatusPage Contacts] Initial processing of contact listeners complete. Setting isLoadingContactStatuses to FALSE.");
            setIsLoadingContactStatuses(false);
         }
        });
    };

    if (contextChats.length > 0) {
        const contactUserIds = Array.from(new Set(
            contextChats
            .filter(chat => chat.type === 'individual' && chat.participants.includes(currentAuthUserId) && (!chat.requestStatus || chat.requestStatus === 'accepted' || chat.requestStatus === 'none') && chat.contactUserId && chat.contactUserId !== currentAuthUserId)
            .map(chat => chat.contactUserId!)
        ));
        console.log(`[StatusPage Contacts] Derived contactUserIds from context: ${contactUserIds.join(', ')}`);
        processContactIds(contactUserIds);
    } else if (!isFetchingOwnContacts) {
        setIsFetchingOwnContacts(true);
        console.log("[StatusPage Contacts] Context chats empty. Fetching own contacts directly.");
        const chatsCollectionRef = collection(firestore, 'chats');
        const q = query(chatsCollectionRef, where('participants', 'array-contains', currentAuthUserId));
        getDocs(q).then(snapshot => {
            if (unmounted) return;
            const directContactIds = Array.from(new Set(
                snapshot.docs.flatMap(doc => {
                    const data = doc.data();
                    if (data.type === 'individual' && (!data.requestStatus || data.requestStatus === 'accepted' || data.requestStatus === 'none')) {
                        return data.participants.filter((pId: string) => pId !== currentAuthUserId);
                    }
                    return [];
                })
            ));
            console.log(`[StatusPage Contacts] Directly fetched contactUserIds: ${directContactIds.join(', ')}`);
            processContactIds(directContactIds as string[]);
        }).catch(err => {
            if (unmounted) return;
            console.error("[StatusPage Contacts] Error fetching own contacts directly:", err);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load contact list for statuses.' });
            setContactStatuses([]);
            setIsLoadingContactStatuses(false);
        }).finally(() => {
            if (unmounted) return;
            setIsFetchingOwnContacts(false);
        });
    }

    return cleanup;
  }, [authUser?.id, contextChats, toast, isLocallyLoadingChats]);

  const handleMyStatusClick = async () => {
    if (!authUser?.id) return;
    if (currentUserHasActiveStatus && !isOwnStatusViewedByCurrentUser) {
      // This is now handled inside the StatusViewPage. When an item is displayed, it's marked as viewed.
      // The logic here is simplified to just navigating.
    }
    if (currentUserHasActiveStatus) { router.push(`/status/view/${authUser.id}`); }
    else { router.push('/status/create'); }
  };

  const handleAddStatusViaFab = () => { router.push('/status/create'); };
  const handleContactStatusClick = (contactId: string) => { router.push(`/status/view/${contactId}`); };

  const headerActions = null;
  const sortedContactStatuses = useMemo(() => {
    return [...contactStatuses].sort((a, b) => {
      if (a.isViewedByCurrentUser && !b.isViewedByCurrentUser) return 1;
      if (!a.isViewedByCurrentUser && b.isViewedByCurrentUser) return -1;
      return (b.lastMediaTimestamp || 0) - (a.lastMediaTimestamp || 0);
    });
  }, [contactStatuses]);

  const showPageLoader = isAuthLoading || (isAuthenticated && (isLoadingCurrentUserStatus || isLocallyLoadingChats || isLoadingContactStatuses || isFetchingOwnContacts));

  if (showPageLoader) {
    return (
      <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
         <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-muted-foreground text-center">Loading Status Updates...</p>
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

  const myStatusRingClass = currentUserHasActiveStatus
    ? (isOwnStatusViewedByCurrentUser ? "border-2 border-[hsl(var(--status-ring-viewed-border))]" : "bg-gradient-to-r from-primary to-accent animate-spin-slow")
    : "border-2 border-dashed border-muted-foreground/30";
  const myStatusPlusIconBgClass = currentUserHasActiveStatus && !isOwnStatusViewedByCurrentUser
    ? "bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--primary))] text-accent-foreground"
    : "bg-muted text-muted-foreground";
  const myStatusText = currentUserHasActiveStatus
    ? (isOwnStatusViewedByCurrentUser ? "Viewed your status" : "Tap to view or add more")
    : "Tap to add status update";

  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
      <PageHeader title="Status" actions={headerActions} />
      <SwipeablePageWrapper className="flex-grow overflow-hidden">
        <main className="h-full overflow-y-auto mb-16 hide-scrollbar">
          <div className="p-3">
            {authUser && (
              <div
                className="flex items-center space-x-3 py-3 cursor-pointer hover:bg-muted/30 rounded-lg"
                onClick={handleMyStatusClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleMyStatusClick()}
                aria-label="Manage my status"
              >
                <div className="relative w-[60px] h-[60px]">
                  <div className={cn("absolute inset-0 rounded-full", myStatusRingClass)} />
                  <div className={cn(
                      "absolute rounded-full bg-background overflow-hidden",
                      currentUserHasActiveStatus ? "inset-[2px]" : "inset-0"
                  )}>
                    <Avatar className="w-full h-full">
                      <AvatarImage src={authUser?.avatarUrl || undefined} alt={authUser?.name || 'User'} data-ai-hint="person avatar"/>
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <UserCircle2 className="w-10 h-10" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className={cn(
                    "absolute bottom-0 right-0 rounded-full w-6 h-6 flex items-center justify-center border-2 border-background transform translate-x-1/4 translate-y-1/4",
                    myStatusPlusIconBgClass
                  )}>
                    <PlusCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">My status</h3>
                  <p className="text-xs text-muted-foreground">{myStatusText}</p>
                </div>
              </div>
            )}
            {sortedContactStatuses.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-muted-foreground px-1 mb-1">Recent updates</h4>
                <div className="space-y-px">
                  {sortedContactStatuses.map((contactStatusItem) => {
                    if (!contactStatusItem.statusDoc) return null;
                    const statusUpdateForListItem: StatusUpdate = {
                        id: contactStatusItem.userProfile.id,
                        userId: contactStatusItem.userProfile.id,
                        timestamp: contactStatusItem.lastMediaTimestamp || (contactStatusItem.statusDoc.createdAt as Timestamp).toMillis(),
                        viewedByCurrentUser: contactStatusItem.isViewedByCurrentUser,
                    };
                    return (
                        <StatusListItem
                        key={contactStatusItem.userProfile.id}
                        statusUpdate={statusUpdateForListItem}
                        user={contactStatusItem.userProfile}
                        onClick={() => handleContactStatusClick(contactStatusItem.userProfile.id)}
                        />
                    );
                   })}
                </div>
              </div>
            )}
            {!showPageLoader && !isFetchingOwnContacts && !isLoadingContactStatuses && sortedContactStatuses.length === 0 && (
                 <div className="text-center py-10 text-muted-foreground">
                    <p>No recent updates from your contacts.</p>
                    <p className="text-xs">When your contacts post statuses, you'll see them here.</p>
                </div>
            )}
          </div>
        </main>
      </SwipeablePageWrapper>
      <div className="fixed bottom-20 right-4 space-y-3 z-20">
         <Button variant="secondary" size="icon" className="rounded-full w-12 h-12 shadow-lg bg-card hover:bg-card/80" aria-label="New text status" onClick={handleAddStatusViaFab} >
          <Pencil className="w-5 h-5" />
        </Button>
        <Button variant="default" size="icon" className="rounded-full w-14 h-14 shadow-xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--primary))] text-primary-foreground hover:opacity-90 transition-opacity" aria-label="New camera status" onClick={handleAddStatusViaFab} >
          <Camera className="w-6 h-6" />
        </Button>
      </div>
      <BottomNavigationBar />
    </div>
  );
}
