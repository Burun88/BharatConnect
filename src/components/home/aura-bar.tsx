
"use client";

import type { FC } from 'react';
import { useMemo } from 'react'; // Added useMemo
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import AuraRingItem from '@/components/aura-item';
import type { User, DisplayAura } from '@/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface AuraBarProps {
  isLoading: boolean;
  allDisplayAuras: DisplayAura[];
  currentUser: User | null;
  connectedUserIds: string[]; // Added prop
}

const AuraBar: FC<AuraBarProps> = ({ isLoading, allDisplayAuras, currentUser, connectedUserIds }) => {
  const router = useRouter();

  const handleCurrentUserAuraClick = () => {
    router.push('/aura-select');
  };

  const handleOtherUserAuraClick = (aura: DisplayAura) => {
    console.log("View aura for:", aura.userName);
    // Potentially navigate to a view page: router.push(`/aura-view/${aura.userId}`);
  };

  // Find the current user's aura from allDisplayAuras
  const currentUserAuraFromList = useMemo(() => {
    if (!currentUser) return null;
    return allDisplayAuras.find(aura => aura.userId === currentUser.id) || null;
  }, [allDisplayAuras, currentUser]);

  // Filter for connected users' auras, excluding the current user
  const connectedUsersAuras = useMemo(() => {
    if (isLoading || !currentUser) return [];
    return allDisplayAuras.filter(aura =>
      aura.userId !== currentUser.id && connectedUserIds.includes(aura.userId)
    );
  }, [allDisplayAuras, currentUser, connectedUserIds, isLoading]);

  return (
    <div
      className={cn("px-2 py-3 bg-background aura-horizontal-scroll")}
      data-no-page-swipe="true"
    >
      <ScrollArea className="w-full">
        <div className="flex space-x-1 pb-2 whitespace-nowrap">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center space-y-1 p-1 shrink-0">
                <Skeleton className="w-20 h-20 rounded-full" />
                <Skeleton className="w-16 h-3 rounded" />
              </div>
            ))
          ) : (
            <>
              {/* Current User's Aura Ring */}
              {currentUser && (
                <AuraRingItem
                  key={`aura-current-user-${currentUser.id}`}
                  user={currentUser}
                  activeAura={currentUserAuraFromList || undefined}
                  isCurrentUser
                  onClick={handleCurrentUserAuraClick}
                />
              )}
              {/* Connected Users' Aura Rings */}
              {connectedUsersAuras.map(aura => (
                <AuraRingItem
                  key={`aura-${aura.userId}`}
                  user={{ id: aura.userId, name: aura.userName, avatarUrl: aura.userProfileAvatarUrl }}
                  activeAura={aura}
                  onClick={() => handleOtherUserAuraClick(aura)}
                />
              ))}
            </>
          )}
           {/* Fallback if no auras and not loading, and current user exists but has no aura */}
           {!isLoading && currentUser && !currentUserAuraFromList && connectedUsersAuras.length === 0 && (
             <div className="flex-grow flex items-center justify-center h-20">
                {/* This is now handled by the CurrentUser AuraRingItem with its plus icon */}
             </div>
           )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AuraBar;
