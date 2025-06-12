
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import BottomNavigationBar from '@/components/bottom-navigation-bar';
import HomeHeader from '@/components/home/home-header';
import AuraBar from '@/components/home/aura-bar';
import ChatList from '@/components/home/chat-list';
import type { User, Chat, LocalUserProfile } from '@/types';
import { mockCurrentUser, mockAuraBarItemsData, mockChats as initialMockChats } from '@/lib/mock-data';
import { Plus } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import SwipeablePageWrapper from '@/components/shared/SwipeablePageWrapper';
import { getChatListItemsAction, type GetChatListItemsActionResult } from '@/actions/getChatListItemsAction';
import { useToast } from '@/hooks/use-toast';


const HEADER_HEIGHT_PX = 64;
const BOTTOM_NAV_HEIGHT_PX = 64;
const SCROLL_DELTA = 5;

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [isPageDataLoading, setIsPageDataLoading] = useState(true);

  const [auraBarItems, setAuraBarItems] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [userProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  const [currentUserAuraIdLs] = useLocalStorage<string | null>('currentUserAuraId', null);

  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const [isHeaderContentLoaded, setIsHeaderContentLoaded] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    setIsPageDataLoading(true);

    if (!userProfileLs || !userProfileLs.uid || !userProfileLs.onboardingComplete) {
      console.log(`[HomePage] User from LS not found or not fully onboarded. Redirecting to login.`);
      router.replace('/login');
      return;
    }

    const currentUserId = userProfileLs.uid;
    const currentUserDisplayName = userProfileLs.displayName || 'You';
    const currentUserPhotoURL = userProfileLs.photoURL || null;


    const loadData = async () => {
      // Fetch Aura Bar Items (mock for now, can be dynamic later)
      const currentUserNameForAura = userProfileLs?.displayName || 'User';
      const currentUserEmailForAura = userProfileLs?.email || '';

      const updatedCurrentUserForAura: User = {
        ...mockCurrentUser,
        id: userProfileLs.uid,
        name: currentUserNameForAura,
        email: currentUserEmailForAura,
        avatarUrl: userProfileLs.photoURL || undefined,
        currentAuraId: currentUserAuraIdLs,
      };

      let allUsersFromMock = mockAuraBarItemsData().map(u =>
          u.id === updatedCurrentUserForAura.id ? updatedCurrentUserForAura : u
      );
      const currentUserInMockIndex = allUsersFromMock.findIndex(u => u.id === updatedCurrentUserForAura.id);

      if (currentUserInMockIndex === -1 && updatedCurrentUserForAura.name) {
        allUsersFromMock.unshift(updatedCurrentUserForAura);
      } else if (currentUserInMockIndex > 0) {
         const currentUserData = allUsersFromMock.splice(currentUserInMockIndex, 1)[0];
         allUsersFromMock.unshift(currentUserData);
      }
      const finalMockCurrentUser = allUsersFromMock.find(u => u.id === userProfileLs.uid) || updatedCurrentUserForAura;
      const finalAuraItems = allUsersFromMock.filter(
          u => u.id === finalMockCurrentUser.id || u.currentAuraId
      );
      setAuraBarItems(finalAuraItems as User[]);

      // Fetch live chat requests from Firestore
      let liveRequests: Chat[] = [];
      try {
        console.log(`[HomePage] Calling getChatListItemsAction for user ${currentUserId}...`);
        const result: GetChatListItemsActionResult = await getChatListItemsAction(currentUserId, currentUserDisplayName, currentUserPhotoURL);
        
        console.log("[HomePage] Diagnostics from getChatListItemsAction:");
        if (result.diagnostics && result.diagnostics.length > 0) {
          result.diagnostics.forEach(logMsg => console.log(`  [DIAG] ${logMsg}`));
        } else {
          console.log("[HomePage] No diagnostic messages returned from action.");
        }
        
        liveRequests = result.chats || []; // Ensure result.chats is not undefined
        console.log(`[HomePage] getChatListItemsAction returned ${liveRequests.length} live interactions.`);

      } catch (error) {
        console.error("[HomePage] Error calling or processing getChatListItemsAction:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Requests",
          description: "Could not fetch live chat requests. Please try again later.",
        });
        liveRequests = []; // Ensure liveRequests is an empty array on error
      }
      
      let combinedChatsResult: Chat[];
      if (liveRequests.length > 0) {
        console.log(`[HomePage] Live interactions found (${liveRequests.length}). Merging with non-conflicting mocks.`);
        // Create a set of contactUserIds from live requests to avoid duplication with mock data
        const liveRequestContactIds = new Set(
          liveRequests.map(lr => lr.contactUserId).filter(id => id !== undefined) as string[]
        );
        
        // Filter mock chats to exclude those whose contactUserId is already covered by a live request
        const nonConflictingMockChats = initialMockChats.filter(
          mc => mc.contactUserId && !liveRequestContactIds.has(mc.contactUserId)
        );
        combinedChatsResult = [...liveRequests, ...nonConflictingMockChats];
        console.log(`[HomePage] Number of non-conflicting mock chats: ${nonConflictingMockChats.length}`);
      } else {
        console.log("[HomePage] No live interactions found. Using all initialMockChats as fallback.");
        combinedChatsResult = [...initialMockChats]; // Fallback to all mock data if live fetch fails or returns empty
      }
      console.log(`[HomePage] Total combined chats for display: ${combinedChatsResult.length}`);
      if (combinedChatsResult.length > 0) {
        console.log(`[HomePage] Combined chats (sample):`, combinedChatsResult.slice(0,5).map(c=>({id:c.id, name:c.name, status: c.requestStatus, lastMsg: c.lastMessage?.text?.substring(0,20)})));
      }


      const getChatSortPriority = (chat: Chat): number => {
        if (chat.requestStatus === 'awaiting_action' && chat.requesterId !== currentUserId) {
          return 0; 
        }
        if (chat.requestStatus === 'pending' && chat.requesterId === currentUserId) {
          return 1; 
        }
        if (chat.requestStatus === 'rejected') {
          return 3; 
        }
        // Accepted or no status (effectively accepted)
        return 2; 
      };

      const sortedChats = combinedChatsResult.sort((a, b) => {
        const priorityA = getChatSortPriority(a);
        const priorityB = getChatSortPriority(b);
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        // For chats with the same priority, sort by last message timestamp (descending)
        return (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0);
      });
      
      setChats(sortedChats);
      setIsPageDataLoading(false);
    };

    loadData();

  }, [userProfileLs, currentUserAuraIdLs, router, toast]);


  const handleScroll = useCallback(() => {
    const scrollableElement = scrollableContainerRef.current;
    if (!scrollableElement) return;
    const currentScrollY = scrollableElement.scrollTop;
    if (currentScrollY <= SCROLL_DELTA) {
      setIsHeaderContentLoaded(true);
    } else {
      const scrolledDown = currentScrollY > lastScrollYRef.current;
      const scrolledUp = currentScrollY < lastScrollYRef.current;
      if (scrolledDown && (currentScrollY - lastScrollYRef.current) >= SCROLL_DELTA) {
        setIsHeaderContentLoaded(false);
      } else if (scrolledUp) {
        setIsHeaderContentLoaded(true);
      }
    }
    lastScrollYRef.current = currentScrollY <= 0 ? 0 : currentScrollY;
  }, []);

  useEffect(() => {
    const scrollableElement = scrollableContainerRef.current;
    const updateScrollBehavior = () => {
      if (!scrollableElement || isPageDataLoading || !userProfileLs?.onboardingComplete) {
        setIsHeaderContentLoaded(true);
        if (scrollableElement) scrollableElement.removeEventListener('scroll', handleScroll);
        return;
      }
      const MIN_SCROLL_DIFFERENCE_FOR_ANIMATION = HEADER_HEIGHT_PX * 0.5;
      const isSignificantlyScrollable = scrollableElement.scrollHeight > scrollableElement.clientHeight + MIN_SCROLL_DIFFERENCE_FOR_ANIMATION;
      if (isSignificantlyScrollable) {
        if (scrollableElement.scrollTop > SCROLL_DELTA) setIsHeaderContentLoaded(false);
        else setIsHeaderContentLoaded(true);
        lastScrollYRef.current = scrollableElement.scrollTop;
        scrollableElement.addEventListener('scroll', handleScroll, { passive: true });
      } else {
        setIsHeaderContentLoaded(true);
        scrollableElement.removeEventListener('scroll', handleScroll);
      }
    };
    updateScrollBehavior();
    window.addEventListener('resize', updateScrollBehavior);
    return () => {
      if (scrollableElement) scrollableElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollBehavior);
    };
  }, [isPageDataLoading, chats, searchTerm, handleScroll, userProfileLs?.onboardingComplete]);

  const filteredChats = chats; // Search filtering logic removed for now for simplicity

  const handleCurrentUserAuraClick = useCallback(() => {
    router.push('/aura-select');
  }, [router]);

  if (isPageDataLoading) {
    return (
      <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-muted-foreground">Loading BharatConnect...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
      <HomeHeader isHeaderContentLoaded={isHeaderContentLoaded} />
      <SwipeablePageWrapper className="flex-grow flex flex-col bg-background overflow-hidden min-h-0">
        <main
          ref={scrollableContainerRef}
          className="flex-grow flex flex-col bg-background overflow-y-auto hide-scrollbar min-h-0 w-full"
          style={{
            paddingTop: `${HEADER_HEIGHT_PX}px`,
            paddingBottom: `${BOTTOM_NAV_HEIGHT_PX}px`
          }}
        >
          <AuraBar
            isLoading={isPageDataLoading}
            auraBarItems={isPageDataLoading ? [] : auraBarItems}
            currentUserId={userProfileLs?.uid || ''}
            onCurrentUserAuraClick={handleCurrentUserAuraClick}
          />
          <ChatList
            isLoading={isPageDataLoading}
            filteredChats={filteredChats}
            searchTerm={searchTerm}
            currentUserId={userProfileLs?.uid || ''} 
          />
        </main>
      </SwipeablePageWrapper>
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-xl bg-gradient-bharatconnect-bubble text-primary-foreground hover:opacity-90 transition-opacity z-30"
        aria-label="New chat"
        onClick={() => router.push('/new-chat')}
      >
        <Plus className="w-7 h-7" />
      </Button>
      <BottomNavigationBar />
    </div>
  );
}

