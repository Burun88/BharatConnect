
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

const HEADER_HEIGHT_PX = 64; // Approx h-16 in pixels (16 * 4)
const SCROLL_THRESHOLD = 10; // Min pixels to scroll before toggling header visibility

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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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

    if (currentScrollY < HEADER_HEIGHT_PX / 2) {
      setIsHeaderVisible(true);
    } 
    else {
      if (Math.abs(currentScrollY - lastScrollY) > SCROLL_THRESHOLD) {
        if (currentScrollY > lastScrollY) {
          if (isHeaderVisible && currentScrollY > HEADER_HEIGHT_PX) {
             setIsHeaderVisible(false);
          }
        } else {
          if (!isHeaderVisible) {
            setIsHeaderVisible(true);
          }
        }
      }
    }
    setLastScrollY(currentScrollY <= 0 ? 0 : currentScrollY);
  }, [lastScrollY, isHeaderVisible]);

  useEffect(() => {
    const scrollableElement = scrollableContainerRef.current;
    if (!scrollableElement) return;

    scrollableElement.addEventListener('scroll', handleScroll);
    return () => {
      scrollableElement.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);


  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCurrentUserAuraClick = useCallback(() => {
    router.push('/aura-select');
  }, [router]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-grow flex flex-col bg-background"> 
        <div ref={scrollableContainerRef} className="flex-grow overflow-y-auto hide-scrollbar">
          <HomeHeader isHeaderVisible={isHeaderVisible} />
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
        </div>
      </main>

      <Button
        variant="default"
        size="icon"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-xl bg-gradient-fab-home text-primary-foreground hover:opacity-90 transition-opacity z-10"
        aria-label="New chat"
        onClick={() => router.push('/new-chat')} 
      >
        <Plus className="w-7 h-7" />
      </Button>

      <BottomNavigationBar />
    </div>
  );
}
