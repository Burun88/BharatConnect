
"use client";

import type { FC } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import AuraItem from '@/components/aura-item';
import type { User } from '@/types';

interface AuraBarProps {
  isLoading: boolean;
  auraBarItems: User[];
  currentUserId: string;
  onCurrentUserAuraClick: () => void;
}

const AuraBar: FC<AuraBarProps> = ({ isLoading, auraBarItems, currentUserId, onCurrentUserAuraClick }) => {
  return (
    <div className="px-2 py-3 bg-background aura-horizontal-scroll">
      <ScrollArea className="w-full">
        <div className="flex space-x-1 pb-2 whitespace-nowrap">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center space-y-1 p-1">
                <Skeleton className="w-24 h-24 rounded-full" /> 
                <Skeleton className="w-20 h-4 rounded" />
              </div>
            ))
          ) : (
            auraBarItems.map(user => (
              <AuraItem
                key={user.id}
                user={user}
                isCurrentUser={user.id === currentUserId}
                onClick={user.id === currentUserId ? onCurrentUserAuraClick : undefined}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AuraBar;
