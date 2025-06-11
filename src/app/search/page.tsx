
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BottomNavigationBar from "@/components/bottom-navigation-bar";
import Logo from '@/components/shared/Logo';
import { Search as SearchIconLucide, Settings, X, UserCircle2, Send } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile, User, Chat } from '@/types';
import { mockCurrentUser, mockChats as initialMockChats } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import SwipeablePageWrapper from '@/components/shared/SwipeablePageWrapper';
import { searchUsersAction, type SearchUserActionResult } from '@/actions/searchUsersAction'; // Updated import
import type { BharatConnectFirestoreUser } from '@/services/profileService';

type UserRequestStatus = 'idle' | 'request_sent' | 'chat_exists' | 'is_self';

interface SearchResultUser extends User {
  requestUiStatus: UserRequestStatus;
}

export default function SearchPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  const [isGuardLoading, setIsGuardLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [mockChats, setMockChats] = useState<Chat[]>(initialMockChats);
  const [isSearching, setIsSearching] = useState(false);

  const currentUserId = userProfileLs?.uid || mockCurrentUser.id;

  useEffect(() => {
    if (!userProfileLs || !userProfileLs.uid || !userProfileLs.onboardingComplete) {
      console.log(`[SearchPage] User from LS not found or not fully onboarded. Redirecting to login.`);
      router.replace('/login');
      return;
    }
    setIsGuardLoading(false);
  }, [userProfileLs, router]);

  useEffect(() => {
    if (isGuardLoading) return;

    const performSearch = async () => {
      if (searchTerm.trim() === '') {
        setSearchResults([]);
        return;
      }
      if (!currentUserId) {
        console.warn("[SearchPage] Current user ID not available for search exclusion.");
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        console.log(`[SearchPage CLIENT] Calling searchUsersAction with term: "${searchTerm.trim()}" and excluding UID: "${currentUserId}"`);
        const result: SearchUserActionResult = await searchUsersAction(searchTerm.trim(), currentUserId);
        
        console.log("[SearchPage CLIENT] Diagnostics from searchUsersAction:");
        result.diagnostics.log.forEach(logMsg => console.log(logMsg));
        if (result.diagnostics.directFetchResult) console.log(`Direct Fetch: ${result.diagnostics.directFetchResult}`);
        if (result.diagnostics.testQueryResult) console.log(`Test Query: ${result.diagnostics.testQueryResult}`);
        if (result.diagnostics.nameQueryCount !== undefined) console.log(`Name Query Count: ${result.diagnostics.nameQueryCount}`);
        if (result.diagnostics.emailQueryCount !== undefined) console.log(`Email Query Count: ${result.diagnostics.emailQueryCount}`);
        if (result.diagnostics.usernameQueryCount !== undefined) console.log(`Username Query Count: ${result.diagnostics.usernameQueryCount}`);


        const firebaseUsers: BharatConnectFirestoreUser[] = result.users;
        console.log(`[SearchPage CLIENT] searchUsersAction returned ${firebaseUsers.length} users.`);
        firebaseUsers.forEach(u => console.log(`  [SearchPage CLIENT] User from action: ID=${u.id}, DisplayName='${u.displayName}', Username='${u.username}', Email='${u.email}'`));


        const uiResults: SearchResultUser[] = firebaseUsers
          .map(fbUser => {
            const existingChat = mockChats.find(chat => 
              chat.contactUserId === fbUser.id || (chat.participants.some(p => p.id === fbUser.id) && chat.participants.some(p => p.id === currentUserId))
            );
            
            let requestUiStatus: UserRequestStatus = 'idle';
            
            if (existingChat) {
              if (existingChat.requestStatus === 'pending' && existingChat.requesterId === currentUserId) {
                requestUiStatus = 'request_sent';
              } else if (existingChat.requestStatus === 'awaiting_action' && existingChat.requesterId === fbUser.id) {
                 requestUiStatus = 'request_sent'; 
              } else if (existingChat.requestStatus === 'accepted' || existingChat.requestStatus === 'none' || !existingChat.requestStatus) {
                requestUiStatus = 'chat_exists';
              }
            }
            return { 
                id: fbUser.id,
                name: fbUser.displayName, 
                username: fbUser.username, 
                email: fbUser.email, 
                avatarUrl: fbUser.photoURL || undefined,
                currentAuraId: fbUser.currentAuraId || null,
                status: fbUser.status || 'Offline',
                hasViewedStatus: false,
                requestUiStatus 
            };
          });
        console.log(`[SearchPage CLIENT] Mapped results for UI: ${uiResults.length} users.`);
        uiResults.forEach(u => console.log(`  [SearchPage CLIENT] UI User: ID=${u.id}, Name='${u.name}', Username='${u.username}', Email='${u.email}'`));
        setSearchResults(uiResults);
      } catch (error) {
        console.error("[SearchPage CLIENT] Failed to search users:", error);
        toast({ variant: 'destructive', title: "Search Error", description: "Could not perform search." });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimeout = setTimeout(() => {
      performSearch();
    }, 500);

    return () => clearTimeout(debounceTimeout);

  }, [searchTerm, isGuardLoading, currentUserId, mockChats, toast]);

  const handleSendRequest = (targetUser: SearchResultUser) => {
    if (!userProfileLs) return;

    setSearchResults(prevResults => 
      prevResults.map(u => 
        u.id === targetUser.id ? { ...u, requestUiStatus: 'request_sent' } : u
      )
    );

    toast({
      title: 'Request Sent (Simulated)',
      description: `Your chat request has been sent to ${targetUser.name}.`,
    });

    const newChatId = `chat_req_${currentUserId}_${targetUser.id}`;
    const existingChatIndex = mockChats.findIndex(c => c.id === newChatId || (c.contactUserId === targetUser.id && c.participants.some(p => p.id === currentUserId)));

    if (existingChatIndex === -1) {
      const newRequestChat: Chat = {
        id: newChatId,
        type: 'individual',
        name: targetUser.name, 
        contactUserId: targetUser.id,
        participants: [
          { id: currentUserId, name: userProfileLs.displayName || 'You', username: userProfileLs.username || 'you', avatarUrl: userProfileLs.photoURL || undefined },
          targetUser 
        ],
        lastMessage: null,
        unreadCount: 0,
        avatarUrl: targetUser.avatarUrl,
        requestStatus: 'pending',
        requesterId: currentUserId,
        firstMessageTextPreview: `Hi ${targetUser.name}, I'd like to connect!`,
      };
      setMockChats(prevChats => [newRequestChat, ...prevChats]);
    }
  };
  
  const handleOpenChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const getButtonProps = (user: SearchResultUser): { text: string; onClick: () => void; disabled: boolean; variant: "default" | "secondary" | "outline" } => {
    if (user.requestUiStatus === 'is_self') {
        return { text: 'This is you', onClick: () => {}, disabled: true, variant: "secondary" };
    }
    switch (user.requestUiStatus) {
      case 'request_sent':
        return { text: 'Request Sent', onClick: () => {}, disabled: true, variant: "secondary" };
      case 'chat_exists':
         const existingChat = mockChats.find(chat => 
          chat.contactUserId === user.id || (chat.participants.some(p => p.id === user.id) && chat.participants.some(p => p.id === currentUserId))
        );
        return { text: 'Chat Open', onClick: () => existingChat && handleOpenChat(existingChat.id), disabled: false, variant: "outline" };
      case 'idle':
      default:
        return { text: 'Send Request', onClick: () => handleSendRequest(user), disabled: false, variant: "default" };
    }
  };

  if (isGuardLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-muted-foreground">Loading Search...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
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
              placeholder="Search by name, email, or username (case-insensitive prefix on lowercase data)"
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
                <svg className="animate-spin h-8 w-8 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Searching users...</p>
             </div>
          )}

          {!isSearching && searchTerm.trim() !== '' && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Results</h2>
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((user) => {
                    const buttonProps = getButtonProps(user);
                    return (
                      <div key={user.id} className="flex items-center p-3 bg-card rounded-lg shadow hover:bg-muted/30 transition-colors">
                        <Avatar className="w-12 h-12 mr-4">
                          <AvatarImage src={user.avatarUrl || `https://placehold.co/100x100.png?text=${user.name.charAt(0)}`} alt={user.name} data-ai-hint="person avatar" />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {user.name ? user.name.substring(0, 2).toUpperCase() : <UserCircle2 />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">@{user.username || 'N/A'} &bull; {user.email || 'No email'}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={buttonProps.variant}
                          onClick={buttonProps.onClick}
                          disabled={buttonProps.disabled}
                          className={cn(
                            "ml-3 px-3 py-1.5 h-auto text-xs shrink-0",
                            buttonProps.variant === 'default' && "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90",
                            buttonProps.variant === 'secondary' && "bg-muted text-muted-foreground hover:bg-muted/80",
                            buttonProps.variant === 'outline' && "border-primary text-primary hover:bg-primary/10"
                          )}
                        >
                          {buttonProps.variant === 'default' && !buttonProps.disabled && <Send className="w-3 h-3 mr-1.5" />}
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

