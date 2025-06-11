
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import BottomNavigationBar from '@/components/bottom-navigation-bar';
import HomeHeader from '@/components/home/home-header';
import AuraBar from '@/components/home/aura-bar';
import ChatList from '@/components/home/chat-list';
import type { User, Chat, LocalUserProfile } from '@/types';
import { mockCurrentUser, mockAuraBarItemsData, mockChats as initialMockChats } from '@/lib/mock-data'; // Renamed import for clarity
import { Plus } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import SwipeablePageWrapper from '@/components/shared/SwipeablePageWrapper';

const HEADER_HEIGHT_PX = 64;
const BOTTOM_NAV_HEIGHT_PX = 64;
const SCROLL_DELTA = 5;

export default function HomePage() {
  const router = useRouter();

  const [isPageDataLoading, setIsPageDataLoading] = useState(true);

  const [auraBarItems, setAuraBarItems] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [userProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  const [currentUserAuraIdLs] = useLocalStorage<string | null>('currentUserAuraId', null); // Fetch current user's aura

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

    setTimeout(() => {
      const currentUserName = userProfileLs?.displayName || 'User';
      const currentUserEmail = userProfileLs?.email || '';

      const updatedCurrentUser: User = {
        ...mockCurrentUser, // Base
        id: userProfileLs.uid,
        name: currentUserName,
        email: currentUserEmail,
        avatarUrl: userProfileLs.photoURL || undefined, // Use LS photoURL or undefined
        currentAuraId: currentUserAuraIdLs, // Use aura from its LS item
      };

      let allUsersFromMock = mockAuraBarItemsData().map(u =>
          u.id === updatedCurrentUser.id ? updatedCurrentUser : u
      );
      const currentUserInMockIndex = allUsersFromMock.findIndex(u => u.id === updatedCurrentUser.id);

      if (currentUserInMockIndex === -1 && updatedCurrentUser.name) {
        allUsersFromMock.unshift(updatedCurrentUser);
      } else if (currentUserInMockIndex > 0) {
         const currentUserData = allUsersFromMock.splice(currentUserInMockIndex, 1)[0];
         allUsersFromMock.unshift(currentUserData);
      }

      const finalMockCurrentUser = allUsersFromMock.find(u => u.id === userProfileLs.uid) || updatedCurrentUser;

      const finalAuraItems = allUsersFromMock.filter(
          u => u.id === finalMockCurrentUser.id || u.currentAuraId
      );

      setAuraBarItems(finalAuraItems as User[]);

      const getChatSortPriority = (chat: Chat): number => {
        if (chat.requestStatus === 'awaiting_action' && chat.requesterId !== currentUserId) {
          return 0; // Highest priority: requests to accept/reject
        }
        if (chat.requestStatus === 'pending' && chat.requesterId === currentUserId) {
          return 1; // Next priority: requests user has sent
        }
        // For accepted, rejected, or 'none' (legacy/default) statuses, use a lower priority
        // We can further differentiate if needed, e.g., make 'rejected' even lower.
        if (chat.requestStatus === 'rejected') {
          return 3; 
        }
        return 2; // Default for active chats or chats with 'none' or 'accepted' status
      };

      const sortedChats = [...initialMockChats] // Use imported initialMockChats
        .sort((a, b) => {
          const priorityA = getChatSortPriority(a);
          const priorityB = getChatSortPriority(b);

          if (priorityA !== priorityB) {
            return priorityA - priorityB; // Sort by priority first
          }
          // If priorities are the same (e.g., within active chats, or within pending requests),
          // sort by last message timestamp (descending - most recent first)
          return (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0);
        });
      
      setChats(sortedChats);
      setIsPageDataLoading(false);
    }, 1500);

  }, [userProfileLs, currentUserAuraIdLs, router]);


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

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            currentUserId={userProfileLs?.uid || mockCurrentUser.id}
            onCurrentUserAuraClick={handleCurrentUserAuraClick}
          />
          <ChatList
            isLoading={isPageDataLoading}
            filteredChats={filteredChats}
            searchTerm={searchTerm}
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
