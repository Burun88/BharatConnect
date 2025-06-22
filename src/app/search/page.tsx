
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BottomNavigationBar from "@/components/bottom-navigation-bar";
import Logo from '@/components/shared/Logo';
import { Search as SearchIconLucide, Settings, X, UserCircle2, Send, Clock, Loader2 } from 'lucide-react'; // Import Loader2
import { useAuth } from '@/contexts/AuthContext';
import { useChat as useChatContextHook } from '@/contexts/ChatContext';
import type { User, Chat } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import SwipeablePageWrapper from '@/components/shared/SwipeablePageWrapper';
import type { BharatConnectFirestoreUser } from '@/services/profileService';
import { firestore } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, getDocs, limit, orderBy, startAt, endAt, Timestamp, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { formatDistanceToNowStrict } from 'date-fns';

type UserRequestStatus = 'idle' | 'request_sent' | 'chat_exists' | 'is_self' | 'on_cooldown';

interface SearchResultUser extends User {
  requestUiStatus: UserRequestStatus;
  cooldownEndsAt?: number; // Timestamp in milliseconds
}

function formatCooldownTime(endTime: number): string {
  const now = Date.now();
  if (endTime <= now) return "Send Request";

  const diff = endTime - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `Wait ${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `Wait ${minutes}m`;
  }
  return "Wait <1m";
}


export default function SearchPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { authUser, isAuthenticated, isAuthLoading } = useAuth();
  const { chats: contextChats, setChats: setContextChats } = useChatContextHook(); 

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);
  const [cooldownTimers, setCooldownTimers] = useState<Record<string, string>>({});

  const currentUserId = authUser?.id;
  const currentUserDisplayName = authUser?.name;
  const currentUserPhotoURL = authUser?.avatarUrl;


  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    if (!isAuthenticated) {
      console.log(`[SearchPage] Not authenticated, AuthContext should redirect.`);
      return;
    }
  }, [isAuthenticated, isAuthLoading, router]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !currentUserId) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      const trimmedSearchTerm = searchTerm.trim();
      if (trimmedSearchTerm === '') {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      const lowerSearchTerm = trimmedSearchTerm.toLowerCase();
      const resultsLimit = 10;
      const usersRef = collection(firestore, 'bharatConnectUsers');
      const usersMap = new Map<string, BharatConnectFirestoreUser>();

      try {
        const nameQuery = query( usersRef, orderBy('displayName'), startAt(lowerSearchTerm), endAt(lowerSearchTerm + '\uf8ff'), limit(resultsLimit));
        const nameSnapshot = await getDocs(nameQuery);
        nameSnapshot.forEach((docSnap) => { if (docSnap.id !== currentUserId && !usersMap.has(docSnap.id)) usersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as BharatConnectFirestoreUser); });

        const usernameQuery = query( usersRef, orderBy('username'), startAt(lowerSearchTerm), endAt(lowerSearchTerm + '\uf8ff'), limit(resultsLimit));
        const usernameSnapshot = await getDocs(usernameQuery);
        usernameSnapshot.forEach((docSnap) => { if (docSnap.id !== currentUserId && !usersMap.has(docSnap.id)) usersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as BharatConnectFirestoreUser); });
        
        const emailQuery = query( usersRef, orderBy('email'), startAt(lowerSearchTerm), endAt(lowerSearchTerm + '\uf8ff'), limit(resultsLimit));
        const emailSnapshot = await getDocs(emailQuery);
        emailSnapshot.forEach((docSnap) => { if (docSnap.id !== currentUserId && !usersMap.has(docSnap.id)) usersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as BharatConnectFirestoreUser); });

        const firebaseUsers: BharatConnectFirestoreUser[] = Array.from(usersMap.values());
        
        const uiResultsPromises = firebaseUsers.map(async (fbUser) => {
            const existingChat = contextChats.find(chat => chat.contactUserId === fbUser.id || (chat.participants?.includes(fbUser.id) && chat.participants?.includes(currentUserId)));
            let requestUiStatus: UserRequestStatus = 'idle';
            let cooldownEndsAt: number | undefined = undefined;

            // Check for cooldown
            const cooldownDocId = `${currentUserId}_${fbUser.id}`;
            const cooldownDocRef = doc(firestore, `requestCooldowns/${cooldownDocId}`);
            const cooldownSnap = await getDoc(cooldownDocRef);

            if (cooldownSnap.exists()) {
                const data = cooldownSnap.data();
                const endsAtMillis = (data.cooldownEndsAt as Timestamp).toMillis();
                if (endsAtMillis > Date.now()) {
                    requestUiStatus = 'on_cooldown';
                    cooldownEndsAt = endsAtMillis;
                }
            }

            if (requestUiStatus !== 'on_cooldown' && existingChat) {
              if (existingChat.requestStatus === 'pending' && existingChat.requesterId === currentUserId) requestUiStatus = 'request_sent';
              else if (existingChat.requestStatus === 'awaiting_action' && existingChat.requesterId === fbUser.id) requestUiStatus = 'request_sent'; 
              else if (existingChat.requestStatus === 'accepted' || existingChat.requestStatus === 'none' || !existingChat.requestStatus) requestUiStatus = 'chat_exists';
            }
            
            return {
                id: fbUser.id,
                name: fbUser.originalDisplayName || fbUser.displayName || 'Unknown User',
                username: fbUser.username || undefined, email: fbUser.email || undefined,
                avatarUrl: fbUser.photoURL || undefined, currentAuraId: fbUser.currentAuraId || null,
                status: fbUser.status || 'Offline', hasViewedStatus: false,
                onboardingComplete: fbUser.onboardingComplete,
                requestUiStatus, cooldownEndsAt
            };
          });
        const uiResults = await Promise.all(uiResultsPromises);
        setSearchResults(uiResults);

      } catch (error: any) {
        console.error("[SearchPage CLIENT] Failed to search users:", error);
        toast({ variant: 'destructive', title: "Search Error", description: `Could not perform search. ${error.message || 'Ensure Firestore indexes are set up if this persists.'}` });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimeout = setTimeout(() => {
      performSearch();
    }, 500);

    return () => clearTimeout(debounceTimeout);

  }, [searchTerm, isAuthenticated, isAuthLoading, currentUserId, contextChats, toast]);


  useEffect(() => {
    const intervalIds: NodeJS.Timeout[] = [];
    const newCooldownTimers: Record<string, string> = {};

    searchResults.forEach(user => {
      if (user.requestUiStatus === 'on_cooldown' && user.cooldownEndsAt) {
        newCooldownTimers[user.id] = formatCooldownTime(user.cooldownEndsAt);
        const intervalId = setInterval(() => {
          setCooldownTimers(prev => ({
            ...prev,
            [user.id]: formatCooldownTime(user.cooldownEndsAt!)
          }));
          if (user.cooldownEndsAt! <= Date.now()) {
            // Cooldown ended, refetch search results or update this user's status
            setSearchResults(prev => prev.map(u => u.id === user.id ? {...u, requestUiStatus: 'idle', cooldownEndsAt: undefined} : u));
            clearInterval(intervalId);
          }
        }, 60000); // Update every minute
        intervalIds.push(intervalId);
      }
    });
    setCooldownTimers(newCooldownTimers);

    return () => {
      intervalIds.forEach(clearInterval);
    };
  }, [searchResults]);

  const handleSendRequest = async (targetUser: SearchResultUser) => {
    if (!authUser || !currentUserId || !currentUserDisplayName) {
        toast({ variant: 'destructive', title: "Error", description: "Current user data not found." });
        return;
    }
    if (targetUser.id === currentUserId) {
        toast({ variant: 'destructive', title: "Error", description: "You cannot send a request to yourself." });
        return;
    }

    setSendingRequestId(targetUser.id);

    try {
      const senderRequestPath = `bharatConnectUsers/${currentUserId}/requestsSent/${targetUser.id}`;
      const receiverRequestPath = `bharatConnectUsers/${targetUser.id}/requestsReceived/${currentUserId}`;
      const senderRef = doc(firestore, senderRequestPath);
      const receiverRef = doc(firestore, receiverRequestPath);

      const firstMessageTextPreview = `${currentUserDisplayName} wants to connect with you.`;

      const requestData = {
        status: 'pending',
        timestamp: serverTimestamp(),
      };
      const sentRequestData = { ...requestData, to: targetUser.id, name: targetUser.name, photoURL: targetUser.avatarUrl || null, firstMessageTextPreview: "Request sent. Waiting for approval..." };
      const receivedRequestData = { ...requestData, from: currentUserId, name: currentUserDisplayName, photoURL: currentUserPhotoURL || null, firstMessageTextPreview: firstMessageTextPreview };
      
      const batch = writeBatch(firestore);
      // Use update if doc exists (e.g. from previous rejection), otherwise set.
      // Firestore allows set with merge:true to behave like upsert, but explicit check is safer with rules.
      // For simplicity here, assuming set is what we want for a new request, even if overwriting a 'rejected' one.
      // Firestore rules should ideally handle if re-requesting a rejected one is allowed or needs status update.
      batch.set(senderRef, sentRequestData);
      batch.set(receiverRef, receivedRequestData);
      await batch.commit();


      setSearchResults(prevResults =>
        prevResults.map(u =>
          u.id === targetUser.id ? { ...u, requestUiStatus: 'request_sent' } : u
        )
      );
      
      const newRequestChat: Chat = {
        id: `req_sent_${targetUser.id}`, 
        type: 'individual', name: targetUser.name, contactUserId: targetUser.id,
        participants: [currentUserId, targetUser.id], 
        participantInfo: { [currentUserId]: { name: currentUserDisplayName, avatarUrl: currentUserPhotoURL || null }, [targetUser.id]: { name: targetUser.name, avatarUrl: targetUser.avatarUrl || null }},
        lastMessage: { text: "Request sent. Waiting for approval...", senderId: currentUserId, timestamp: Date.now(), type: 'text', readBy: [currentUserId]},
        updatedAt: Date.now(), unreadCount: 0, avatarUrl: targetUser.avatarUrl,
        requestStatus: 'pending', requesterId: currentUserId, firstMessageTextPreview: "Request sent. Waiting for approval...",
      };
      setContextChats(prev => [...prev, newRequestChat]);

      toast({ title: 'Request Sent!', description: `Your chat request has been sent to ${targetUser.name}.` });

    } catch (error: any) {
      console.error("Error sending chat request:", error);
      toast({ variant: 'destructive', title: 'Request Failed', description: `Could not send chat request. ${error.message || "Check permissions or try again later."}`});
    } finally {
      setSendingRequestId(null);
    }
  };

  const handleOpenChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const getButtonProps = (user: SearchResultUser): { text: string; onClick: () => void; disabled: boolean; variant: "default" | "secondary" | "outline"; icon?: React.ElementType } => {
    if (user.id === currentUserId) {
        return { text: 'This is you', onClick: () => {}, disabled: true, variant: "secondary" };
    }
    const isButtonSending = sendingRequestId === user.id;

    switch (user.requestUiStatus) {
      case 'on_cooldown':
        return { text: cooldownTimers[user.id] || "On Cooldown", onClick: () => {}, disabled: true, variant: "secondary", icon: Clock };
      case 'request_sent':
        return { text: 'Request Sent', onClick: () => {}, disabled: true, variant: "secondary" };
      case 'chat_exists':
         const existingChat = contextChats.find(chat => 
           chat.contactUserId === user.id || (chat.participants?.includes(user.id) && chat.participants?.includes(currentUserId))
         );
        return { text: 'Open Chat', onClick: () => existingChat && handleOpenChat(existingChat.id), disabled: isButtonSending, variant: "outline" };
      case 'idle':
      default:
        return { text: isButtonSending ? 'Sending...' : 'Send Request', onClick: () => handleSendRequest(user), disabled: isButtonSending, variant: "default", icon: Send };
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-muted-foreground text-center">Loading Search...</p>
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
      <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10 h-16">
        <Logo size="medium" />
        <Button variant="ghost" size="icon" onClick={() => toast({ title: "Settings", description: "Settings page coming soon!"})}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <SwipeablePageWrapper className="flex-grow flex flex-col overflow-hidden">
        <main className="flex-grow flex flex-col p-4 space-y-4 overflow-y-auto mb-16 hide-scrollbar">
          <div className="relative">
            <SearchIconLucide className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, or username"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 h-12 text-base rounded-xl shadow-sm focus-visible:focus-visible-gradient-border-apply"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8"
                onClick={() => setSearchTerm('')}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </Button>
            )}
          </div>

          {isSearching && (
             <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10">
                <Loader2 className="animate-spin h-8 w-8 text-primary mb-3" />
                <p className="text-center">Searching users...</p>
             </div>
          )}

          {!isSearching && searchTerm.trim() !== '' && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Results</h2>
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((user) => {
                    const buttonProps = getButtonProps(user);
                    const ButtonIcon = buttonProps.icon;
                    const showUsername = user.username && user.username.toLowerCase() !== 'n/a';
                    return (
                      <div key={user.id} className="flex items-center p-3 bg-card rounded-lg shadow hover:bg-muted/30 transition-colors">
                        <Avatar className="w-12 h-12 mr-4">
                           <AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="person avatar" />
                           <AvatarFallback className="bg-muted text-muted-foreground">
                             <UserCircle2 className="w-8 h-8" />
                           </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                          {showUsername && (
                            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={buttonProps.variant}
                          onClick={buttonProps.onClick}
                          disabled={buttonProps.disabled}
                          className={cn(
                            "ml-3 px-3 py-1.5 h-auto text-xs shrink-0",
                            buttonProps.variant === 'default' && !buttonProps.disabled && "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90",
                            buttonProps.variant === 'secondary' && "bg-muted text-muted-foreground hover:bg-muted/80",
                            buttonProps.variant === 'outline' && "border-primary text-primary hover:bg-primary/10"
                          )}
                        >
                          {ButtonIcon && <ButtonIcon className="w-3 h-3 mr-1.5" />}
                          {buttonProps.text}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">No users found matching "{searchTerm}".</p>
              )}
            </div>
          )}
          {!isSearching && searchTerm.trim() === '' && (
             <div className="flex flex-col items-center justify-center text-center text-muted-foreground pt-10">
                <SearchIconLucide className="w-16 h-16 mb-4"/>
                <p className="text-lg">Search for People</p>
                <p className="text-sm">Find and connect with others on BharatConnect.</p>
             </div>
          )}
        </main>
      </SwipeablePageWrapper>
      <BottomNavigationBar />
    </div>
  );
}


    
