
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import BottomNavigationBar from '@/components/bottom-navigation-bar';
import HomeHeader from '@/components/home/home-header';
import AuraBar from '@/components/home/aura-bar';
import ChatList from '@/components/home/chat-list';
import type { User, Chat } from '@/types';
import { mockCurrentUser, mockAuraBarItemsData, mockChats } from '@/lib/mock-data';
import { Plus } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const HEADER_HEIGHT_PX = 64; // Height of the HomeHeader (h-16)
const BOTTOM_NAV_HEIGHT_PX = 64; // Height of the BottomNavigationBar (h-16)
const SCROLL_DELTA = 5; // Minimum scroll difference to trigger animation

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [auraBarItems, setAuraBarItems] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const initialUserProfile = useMemo(() => ({ name: '', phone: '' }), []);
  const [userProfile] = useLocalStorage('userProfile', initialUserProfile);
  
  const [onboardingComplete] = useLocalStorage('onboardingComplete', false);
  const [currentUserAuraId] = useLocalStorage<string | null>('currentUserAuraId', null);

  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const [isHeaderContentLoaded, setIsHeaderContentLoaded] = useState(true); 
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!onboardingComplete && process.env.NODE_ENV === 'production') { 
        router.replace('/welcome');
    } else {
      setTimeout(() => {
        const updatedCurrentUser = { ...mockCurrentUser, name: userProfile.name || mockCurrentUser.name, currentAuraId: currentUserAuraId, avatarUrl: mockCurrentUser.avatarUrl };
        let allUsersFromMock = mockAuraBarItemsData().map(u => 
            u.id === updatedCurrentUser.id ? updatedCurrentUser : u
        );
        const currentUserIndex = allUsersFromMock.findIndex(u => u.id === updatedCurrentUser.id);
        if (currentUserIndex > 0) {
          allUsersFromMock.splice(currentUserIndex, 1);
          allUsersFromMock.unshift(updatedCurrentUser);
        } else if (currentUserIndex === -1 && updatedCurrentUser.name) {
          allUsersFromMock.unshift(updatedCurrentUser);
        }
        
        const finalAuraItems = allUsersFromMock.filter(
            u => u.id === updatedCurrentUser.id || u.currentAuraId
        );
        
        setAuraBarItems(finalAuraItems as User[]);
        setChats(mockChats);
        setIsLoading(false);
      }, 1500);
    }
  }, [router, onboardingComplete, userProfile.name, currentUserAuraId]);

  const handleScroll = useCallback(() => {
    const scrollableElement = scrollableContainerRef.current;
    if (!scrollableElement) return;

    const currentScrollY = scrollableElement.scrollTop;

    if (currentScrollY <= SCROLL_DELTA) { // Show if at top or very close to it
      setIsHeaderContentLoaded(true);
    } else {
      const scrolledDown = currentScrollY > lastScrollYRef.current;
      const scrolledUp = currentScrollY < lastScrollYRef.current;

      if (scrolledDown && (currentScrollY - lastScrollYRef.current) >= SCROLL_DELTA) {
        setIsHeaderContentLoaded(false);
      } else if (scrolledUp) { // Any upward scroll when not at the top shows header
        setIsHeaderContentLoaded(true);
      }
    }
    lastScrollYRef.current = currentScrollY <= 0 ? 0 : currentScrollY;
  }, []); 

  useEffect(() => {
    const scrollableElement = scrollableContainerRef.current;

    if (isLoading || !scrollableElement) {
      setIsHeaderContentLoaded(true); 
      if (scrollableElement) {
        scrollableElement.removeEventListener('scroll', handleScroll);
      }
      return;
    }

    const canScroll = scrollableElement.scrollHeight > scrollableElement.clientHeight;

    if (canScroll) {
      lastScrollYRef.current = scrollableElement.scrollTop <= 0 ? 0 : scrollableElement.scrollTop;
      scrollableElement.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); // Call once to set initial state based on current scroll
    } else {
      setIsHeaderContentLoaded(true);
      scrollableElement.removeEventListener('scroll', handleScroll);
    }

    return () => {
      if (scrollableElement) {
        scrollableElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isLoading, chats, searchTerm, handleScroll]); // Re-evaluate when isLoading, chats, or searchTerm changes

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCurrentUserAuraClick = useCallback(() => {
    router.push('/aura-select');
  }, [router]);

  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
      <HomeHeader isHeaderContentLoaded={isHeaderContentLoaded} />
      
      <main 
        ref={scrollableContainerRef} 
        className="flex-grow flex flex-col bg-background overflow-y-auto hide-scrollbar min-h-0"
        style={{ 
          paddingTop: `${HEADER_HEIGHT_PX}px`,
          paddingBottom: `${BOTTOM_NAV_HEIGHT_PX}px` 
        }} 
      > 
        <AuraBar 
          isLoading={isLoading} 
          auraBarItems={auraBarItems} 
          currentUserId={mockCurrentUser.id} 
          onCurrentUserAuraClick={handleCurrentUserAuraClick} 
        />
        <ChatList 
          isLoading={isLoading} 
          filteredChats={filteredChats} 
          searchTerm={searchTerm} 
        />
      </main>

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
