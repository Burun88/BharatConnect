
"use client";

import type { FC } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import ChatItem from '@/components/chat-item';
import type { Chat } from '@/types';

interface ChatListProps {
  isLoading: boolean;
  filteredChats: Chat[];
  searchTerm: string;
  currentUserId: string; // Added currentUserId
}

const ChatList: FC<ChatListProps> = ({ isLoading, filteredChats, searchTerm, currentUserId }) => {
  return (
    <div className="bg-background">
      <div className="">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="flex items-center p-3">
              <Skeleton className="w-12 h-12 rounded-full mr-3" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-3/4 h-4 rounded" />
                <Skeleton className="w-1/2 h-3 rounded" />
              </div>
            </div>
          ))
        ) : filteredChats.length > 0 ? (
          filteredChats.map(chat => (
            <ChatItem key={chat.id} chat={chat} currentUserId={currentUserId} /> // Pass currentUserId
          ))
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p>No chats found{searchTerm && ` for "${searchTerm}"`}.</p>
            {!searchTerm && <p>Start a new conversation!</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
