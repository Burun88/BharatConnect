
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area'; // Updated import
import { Skeleton } from '@/components/ui/skeleton';
import BottomNavigationBar from '@/components/bottom-navigation-bar';
import AuraItem from '@/components/aura-item';
import ChatItem from '@/components/chat-item';
import type { User, Chat } from '@/types';
import { mockCurrentUser, mockAuraBarItemsData, mockChats } from '@/lib/mock-data';
import { Search, Plus } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

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


  useEffect(() => {
    if (!onboardingComplete && process.env.NODE_ENV === 'production') { 
        router.replace('/welcome');
    } else {
      setTimeout(() => {
        const updatedCurrentUser = { ...mockCurrentUser, name: userProfile.name || mockCurrentUser.name, currentAuraId: currentUserAuraId };

        const allUsersFromMock = mockAuraBarItemsData().map(u => 
            u.id === updatedCurrentUser.id ? updatedCurrentUser : u
        );

        const currentUserDisplayData = allUsersFromMock.find(u => u.id === updatedCurrentUser.id) || updatedCurrentUser;
        
        // Filter other users: only include those with a currentAuraId
        const otherUsersWithAura = allUsersFromMock.filter(
            u => u.id !== updatedCurrentUser.id && u.currentAuraId
        );

        // Current user always comes first, then other users with auras
        const finalAuraItems = [currentUserDisplayData, ...otherUsersWithAura];
        
        setAuraBarItems(finalAuraItems);
        setChats(mockChats);
        setIsLoading(false);
      }, 1500);
    }
  }, [router, onboardingComplete, userProfile.name, currentUserAuraId]);


  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10 h-16">
        <h1 className="text-2xl font-bold font-headline text-gradient-bharatconnect">BharatConnect</h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow overflow-hidden flex flex-col">
        {/* Aura Bar */}
        <div className="px-2 py-3 border-b border-border bg-card">
          <ScrollArea className="w-full whitespace-nowrap" type="auto">
            <div className="flex space-x-3 pb-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex flex-col items-center space-y-1 p-1">
                    <Skeleton className="w-20 h-20 rounded-full" />
                    <Skeleton className="w-16 h-4 rounded" />
                  </div>
                ))
              ) : (
                auraBarItems.map(user => (
                  <AuraItem
                    key={user.id}
                    user={user}
                    isCurrentUser={user.id === mockCurrentUser.id}
                    onClick={user.id === mockCurrentUser.id ? () => router.push('/aura-select') : undefined}
                  />
                ))
              )}
            </div>
            {/* <ScrollBar orientation="horizontal" /> Removed this line */}
          </ScrollArea>
        </div>
        
        {/* Search Bar for Chats */}
        <div className="p-4 border-b border-border">
          <Input 
            type="search" 
            placeholder="Search chats..." 
            className="w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-grow">
          <div className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="flex items-center p-3 bg-muted">
                  <Skeleton className="w-12 h-12 rounded-full mr-3" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-3/4 h-4 rounded" />
                    <Skeleton className="w-1/2 h-3 rounded" />
                  </div>
                </div>
              ))
            ) : filteredChats.length > 0 ? (
              filteredChats.map(chat => (
                <ChatItem key={chat.id} chat={chat} />
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>No chats found{searchTerm && ` for "${searchTerm}"`}.</p>
                {!searchTerm && <p>Start a new conversation!</p>}
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      {/* Floating Action Button */}
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-xl bg-gradient-fab-home text-primary-foreground hover:opacity-90 transition-opacity z-10"
        aria-label="New chat"
        onClick={() => router.push('/new-chat')} 
      >
        <Plus className="w-7 h-7" />
      </Button>

      {/* Bottom Navigation */}
      <BottomNavigationBar />
    </div>
  );
}
