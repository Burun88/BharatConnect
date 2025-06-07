
"use client";

import type { User } from '@/types';
import { AURA_OPTIONS } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import React from 'react';

interface AuraItemProps {
  user: User;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

export default function AuraItem({ user, isCurrentUser = false, onClick }: AuraItemProps) {
  const aura = AURA_OPTIONS.find(a => a.id === user.currentAuraId);

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const mainElementSize = "w-16 h-16"; // 64px
  const smallCircleSize = "w-7 h-7"; // 28px
  const smallCircleIconSize = "w-4 h-4";
  const smallCircleEmojiFontSize = "text-sm";

  const ItemContainer: React.FC<{ children: React.ReactNode; 'aria-label': string }> = ({ children, ...props }) => (
    <div
      className="flex flex-col items-center space-y-1 text-center p-1 shrink-0 cursor-pointer"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick?.()}
      aria-label={props['aria-label']}
    >
      {children}
    </div>
  );

  const AvatarWithOverlap: React.FC<{
    avatarContent: React.ReactNode; // This will be the <Avatar> component
    overlapContent?: React.ReactNode;
    isRing?: boolean;
    ringGradient?: string;
  }> = ({ avatarContent, overlapContent, isRing, ringGradient }) => {
    return (
      <div className={cn("relative", mainElementSize)}> {/* Base container, w-16 h-16 */}
        {isRing && ringGradient && (
          <>
            {/* Spinning Gradient Ring (Background Layer) */}
            <div
              className={cn(
                "absolute inset-0 rounded-full animate-spin-slow",
                ringGradient
              )}
            />
            {/* Static Avatar Container (Foreground Layer) - Padded to reveal the ring */}
            <div className="relative w-full h-full rounded-full p-1.5"> {/* p-1.5 for 6px ring thickness */}
              {/* Masking div for avatar content to ensure bg and overflow */}
              <div className="w-full h-full rounded-full bg-background overflow-hidden">
                {React.cloneElement(avatarContent as React.ReactElement, { className: cn((avatarContent as React.ReactElement).props.className, "w-full h-full") })}
              </div>
            </div>
          </>
        )}
        {!isRing && (
          // If not a ring, render avatarContent directly, assuming it's an <Avatar> sized appropriately
          React.cloneElement(avatarContent as React.ReactElement, { className: cn((avatarContent as React.ReactElement).props.className, mainElementSize) })
        )}

        {overlapContent && (
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center border-2 border-background",
              smallCircleSize,
              // top-14 on a 64px (h-16) container means the small circle's top edge is 8px from the bottom of the container.
              // The small circle is h-7 (28px), so 8px of it will overlap upwards.
              "top-[calc(theme(spacing.16)-theme(spacing.2))]"
            )}
          >
            {overlapContent}
          </div>
        )}
      </div>
    );
  };


  const nameText = (
    <span className="text-xs text-foreground truncate w-16 text-center mt-0.5">
      {isCurrentUser ? (aura ? "Your Aura" : "Your Story") : user.name}
    </span>
  );

  const currentUserAvatar = (
    <Avatar> {/* Default Avatar sizing will be used, w-full h-full will make it fit its container */}
      {user.avatarUrl ? (
        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
      ) : (
        <AvatarFallback className={cn(isRing && aura ? "bg-transparent" : "bg-card text-card-foreground")}>
          {getInitials(user.name)}
        </AvatarFallback>
      )}
    </Avatar>
  );

  const otherUserAvatar = (
    <Avatar>
        {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
        ) : (
            <AvatarFallback className={cn(isRing && aura ? "bg-transparent" : "bg-card text-card-foreground")}>
            {getInitials(user.name)}
            </AvatarFallback>
        )}
    </Avatar>
  );


  if (isCurrentUser && !aura) {
    // "Your Story" UI: Avatar (no ring), then Plus in an overlapping circle
    return (
      <ItemContainer aria-label="Set your story or aura">
        <AvatarWithOverlap
          isRing={false} // No ring for "Your Story"
          avatarContent={ // Avatar should be sized mainElementSize and have bg-card
             <Avatar className="bg-card">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
              ) : (
                <AvatarFallback className="bg-card text-card-foreground">
                  {getInitials(user.name)}
                </AvatarFallback>
              )}
            </Avatar>
          }
          overlapContent={
            <div className={cn("w-full h-full rounded-full flex items-center justify-center bg-primary")}>
              <Plus className={cn(smallCircleIconSize, "text-primary-foreground")} />
            </div>
          }
        />
        {nameText}
      </ItemContainer>
    );
  }

  if (aura) {
    // Aura UI: Static Avatar inside a spinning gradient ring, then Emoji in an overlapping circle
    return (
      <ItemContainer aria-label={`${user.name} - ${aura.name} aura`}>
        <AvatarWithOverlap
          isRing
          ringGradient={aura.gradient}
          avatarContent={isCurrentUser ? currentUserAvatar : otherUserAvatar}
          overlapContent={
            <div className={cn("w-full h-full rounded-full flex items-center justify-center bg-card")}>
              <span className={smallCircleEmojiFontSize}>{aura.emoji}</span>
            </div>
          }
        />
        {nameText}
      </ItemContainer>
    );
  }

  // Default UI (other users, no aura): Avatar, no overlapping circle, no ring
  return (
    <ItemContainer aria-label={user.name}>
      <AvatarWithOverlap
        isRing={false}
        avatarContent={ // Avatar should be sized mainElementSize and have bg-card
            <Avatar className="bg-card">
            {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
            ) : (
                <AvatarFallback className="bg-card text-card-foreground">
                {getInitials(user.name)}
                </AvatarFallback>
            )}
            </Avatar>
        }
      />
      {nameText}
    </ItemContainer>
  );
}

