
"use client";

import type { User, DisplayAura } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, UserCircle2 } from 'lucide-react';
import React from 'react';

interface AuraRingItemProps {
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  activeAura?: DisplayAura;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

const AuraRingItemComponent = ({ user, activeAura, isCurrentUser = false, onClick }: AuraRingItemProps) => {

  const handleItemClick = () => {
    if (onClick) onClick();
  };

  const IMAGE_SIZE_CLASS = "w-[76px] h-[76px]";
  const RING_WRAPPER_SIZE_CLASS = "w-20 h-20"; // 80px

  const iconPositionClass = "bottom-[-12px] left-1/2 transform -translate-x-1/2";

  const SmallIconOverlay: React.FC<{ children: React.ReactNode, gradient?: string, positionClass?: string }> = ({ children, gradient, positionClass }) => (
    <div
      className={cn(
        "absolute w-6 h-6 rounded-full flex items-center justify-center border-2 border-background shadow-md",
        gradient || "bg-primary", 
        positionClass 
      )}
    >
      {children}
    </div>
  );

  return (
    <div
      className="flex flex-col items-center p-1 shrink-0 cursor-pointer" 
      onClick={handleItemClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleItemClick()}
      aria-label={isCurrentUser ? "Your Aura" : `${user.name}'s Aura`}
    >
      <div className={cn("relative", RING_WRAPPER_SIZE_CLASS)}>
        {/* Gradient Ring for active aura */}
        {activeAura && activeAura.auraStyle?.gradient && (
          <div
            className={cn(
              "absolute inset-0 rounded-full animate-spin-slow",
              activeAura.auraStyle.gradient
            )}
          />
        )}

        {/* User's Profile Picture or Fallback */}
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden",
            IMAGE_SIZE_CLASS,
            (activeAura && activeAura.auraStyle?.gradient) && "bg-background p-0.5" 
          )}
        >
          <Avatar className="w-full h-full">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="person avatar"/>
            <AvatarFallback className="bg-muted">
              <UserCircle2 className="w-12 h-12 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Emoji for active aura */}
        {activeAura && activeAura.auraStyle?.emoji && (
          <SmallIconOverlay
            gradient="bg-muted" 
            positionClass={iconPositionClass}
          >
            <span className="text-xs">{activeAura.auraStyle.emoji}</span>
          </SmallIconOverlay>
        )}

        {/* Plus icon for current user's empty aura slot */}
        {isCurrentUser && !activeAura && (
          <SmallIconOverlay
            gradient="bg-muted"
            positionClass={iconPositionClass}
          >
            <PlusCircle className="w-3.5 h-3.5 text-muted-foreground" />
          </SmallIconOverlay>
        )}
      </div>

      <span className={cn("text-xs text-foreground truncate text-center w-20 mt-4")}>
        {isCurrentUser ? "Your Aura" : user.name}
      </span>
    </div>
  );
}

const AuraRingItem = React.memo(AuraRingItemComponent);
export default AuraRingItem;
