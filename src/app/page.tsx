
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import BottomNavigationBar from '@/components/bottom-navigation-bar';
import HomeHeader from '@/components/home/home-header';
import AuraBar from '@/components/home/aura-bar';
import ChatList from '@/components/home/chat-list';
import type { User, Chat } from '@/types'; // BharatConnect User type
import { mockCurrentUser, mockAuraBarItemsData, mockChats } from '@/lib/mock-data';
import { Plus } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { auth } from '@/lib/firebase';
import type { User as AuthUser } from 'firebase/auth'; // Firebase Auth User type
import { onAuthStateChanged } from 'firebase/auth';

const HEADER_HEIGHT_PX = 64; 
const BOTTOM_NAV_HEIGHT_PX = 64; 
const SCROLL_DELTA = 5; 

export default function HomePage() {
  const router = useRouter();
  
  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(undefined); // undefined: loading, null: no user, AuthUser: user object
  const [authCheckCompleted, setAuthCheckCompleted] = useState(false);

  // Page content loading state (after auth and onboarding checks pass)
  const [isPageDataLoading, setIsPageDataLoading] = useState(true); 
  
  const [auraBarItems, setAuraBarItems] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const initialUserProfile = useMemo(() => ({ name: '', phone: '', email: '' }), []);
  const [userProfile] = useLocalStorage('userProfile', initialUserProfile);
  const [onboardingComplete] = useLocalStorage('onboardingComplete', false);
  const [currentUserAuraId] = useLocalStorage<string | null>('currentUserAuraId', null);

  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const [isHeaderContentLoaded, setIsHeaderContentLoaded] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthCheckCompleted(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authCheckCompleted) {
      setIsPageDataLoading(true); // Keep page in loading state until auth check is done
      return;
    }

    if (!authUser) {
      router.replace('/login');
      return;
    }

    if (!onboardingComplete) {
      router.replace('/profile-setup');
      return;
    }

    // AuthUser exists and onboarding is complete. Proceed to load actual page data.
    setIsPageDataLoading(true); 
    setTimeout(() => {
      const updatedCurrentUser = { ...mockCurrentUser, id: authUser.uid, name: userProfile.name || authUser.displayName || 'User', email: authUser.email || userProfile.email, currentAuraId: currentUserAuraId, avatarUrl: authUser.photoURL || mockCurrentUser.avatarUrl };
      
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


      const finalAuraItems = allUsersFromMock.filter(
          u => u.id === updatedCurrentUser.id || u.currentAuraId
      );

      setAuraBarItems(finalAuraItems as User[]);
      setChats(mockChats); // Assuming mockChats are fine for now
      setIsPageDataLoading(false); 
    }, 1500);

  }, [authCheckCompleted, authUser, onboardingComplete, router, userProfile.name, userProfile.email, currentUserAuraId]);


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
      if (!scrollableElement || isPageDataLoading || !authCheckCompleted || !authUser || !onboardingComplete) {
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
  }, [isPageDataLoading, chats, searchTerm, handleScroll, authCheckCompleted, authUser, onboardingComplete]);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCurrentUserAuraClick = useCallback(() => {
    router.push('/aura-select');
  }, [router]);

  if (!authCheckCompleted || isPageDataLoading) {
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
      <main
        ref={scrollableContainerRef}
        className="flex-grow flex flex-col bg-background overflow-y-auto hide-scrollbar min-h-0"
        style={{
          paddingTop: `${HEADER_HEIGHT_PX}px`,
          paddingBottom: `${BOTTOM_NAV_HEIGHT_PX}px`
        }}
      >
        <AuraBar
          isLoading={isPageDataLoading} // AuraBar loading linked to page data loading
          auraBarItems={isPageDataLoading ? [] : auraBarItems}
          currentUserId={authUser?.uid || mockCurrentUser.id}
          onCurrentUserAuraClick={handleCurrentUserAuraClick}
        />
        <ChatList
          isLoading={isPageDataLoading} // ChatList loading linked to page data loading
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
