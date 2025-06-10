
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import BottomNavigationBar from '@/components/bottom-navigation-bar';
import HomeHeader from '@/components/home/home-header';
import AuraBar from '@/components/home/aura-bar';
import ChatList from '@/components/home/chat-list';
import type { User, Chat, LocalUserProfile } from '@/types'; // BharatConnect User type
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
  
  const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(undefined); 
  const [authCheckCompleted, setAuthCheckCompleted] = useState(false);
  const [isPageDataLoading, setIsPageDataLoading] = useState(true); 
  
  const [auraBarItems, setAuraBarItems] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const initialProfile = {} as LocalUserProfile;
  const [userProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', initialProfile);
  const [onboardingCompleteLs] = useLocalStorage('onboardingComplete', false);
  const [currentUserAuraId] = useLocalStorage<string | null>('currentUserAuraId', null); // Keep for aura functionality

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
      setIsPageDataLoading(true); 
      return;
    }

    if (!authUser) {
      router.replace('/login'); // Go to new login hub
      return;
    }

    // Check onboardingComplete from localStorage, which should be set at end of profile-setup
    if (!onboardingCompleteLs || userProfileLs?.uid !== authUser.uid) {
      // If LS says not complete OR if the UID in LS doesn't match current auth user,
      // send to profile setup to ensure profile is correct for this user.
      // This handles cases where user might have logged out and logged in as different user.
      console.log(`[HomePage] User ${authUser.uid} not fully onboarded or LS mismatch. Redirecting to profile-setup.`);
      router.replace('/profile-setup');
      return;
    }

    // AuthUser exists and onboarding is complete for this user. Proceed to load actual page data.
    setIsPageDataLoading(true); 
    setTimeout(() => {
      // Use userProfileLs for name, email, photo if available
      const currentUserName = userProfileLs?.displayName || authUser.displayName || 'User';
      const currentUserEmail = userProfileLs?.email || authUser.email || '';
      const currentUserAvatar = userProfileLs?.photoURL || authUser.photoURL || mockCurrentUser.avatarUrl;

      const updatedCurrentUser: User = { 
        ...mockCurrentUser, 
        id: authUser.uid, 
        name: currentUserName, 
        email: currentUserEmail, 
        currentAuraId: currentUserAuraId, 
        avatarUrl: currentUserAvatar
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

      const finalAuraItems = allUsersFromMock.filter(
          u => u.id === updatedCurrentUser.id || u.currentAuraId
      );

      setAuraBarItems(finalAuraItems as User[]);
      setChats(mockChats); 
      setIsPageDataLoading(false); 
    }, 1500);

  }, [authCheckCompleted, authUser, onboardingCompleteLs, userProfileLs, router, currentUserAuraId]);


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
      if (!scrollableElement || isPageDataLoading || !authCheckCompleted || !authUser || !onboardingCompleteLs) {
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
  }, [isPageDataLoading, chats, searchTerm, handleScroll, authCheckCompleted, authUser, onboardingCompleteLs]);

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
          isLoading={isPageDataLoading} 
          auraBarItems={isPageDataLoading ? [] : auraBarItems}
          currentUserId={authUser?.uid || mockCurrentUser.id}
          onCurrentUserAuraClick={handleCurrentUserAuraClick}
        />
        <ChatList
          isLoading={isPageDataLoading} 
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
