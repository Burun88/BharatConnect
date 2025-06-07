
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

  const IMAGE_SIZE_CLASS = "w-20 h-20"; // 80px
  // Ring thickness is p-1.5 (6px on each side), so 12px total.
  // Overall size = 80px + 12px = 92px.
  const mainElementSize = "w-[92px] h-[92px]";

  const smallCircleSize = "w-7 h-7";
  const smallCircleIconSize = "w-4 h-4";
  const smallCircleEmojiFontSize = "text-sm";
  // For an h-[92px] main container, and h-7 (28px) emoji circle.
  // To have ~8px of emoji below the main item, emoji starts at 92px - 8px = 84px.
  const emojiOverlapTopClass = "top-[84px]";


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
    avatarContent: React.ReactNode;
    overlapContent?: React.ReactNode;
    isRing?: boolean;
    ringGradient?: string;
  }> = ({ avatarContent, overlapContent, isRing, ringGradient }) => {
    return (
      <div className={cn("relative", mainElementSize)}>
        {isRing && ringGradient && (
          <div
            className={cn(
              "absolute inset-0 rounded-full animate-spin-slow",
              ringGradient
            )}
          />
        )}
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden",
          IMAGE_SIZE_CLASS, // This div is w-20 h-20
          isRing && "bg-background" // Covers the ring part it sits on
        )}>
          {React.cloneElement(avatarContent as React.ReactElement, {
            className: cn((avatarContent as React.ReactElement).props.className, "w-full h-full"),
          })}
        </div>

        {overlapContent && (
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center border-2 border-background",
              smallCircleSize,
              emojiOverlapTopClass
            )}
          >
            {overlapContent}
          </div>
        )}
      </div>
    );
  };


  const nameText = (
    <span className={cn("text-xs text-foreground truncate text-center mt-0.5", "w-[92px]")}>
      {isCurrentUser ? (aura ? "Your Aura" : "Your Story") : user.name}
    </span>
  );

  const currentUserAvatar = (
    <Avatar className={IMAGE_SIZE_CLASS}>
      {user.avatarUrl ? (
        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
      ) : (
        <AvatarFallback className={cn(aura ? "bg-transparent" : "bg-card text-card-foreground")}>
          {getInitials(user.name)}
        </AvatarFallback>
      )}
    </Avatar>
  );

  const otherUserAvatar = (
    <Avatar className={IMAGE_SIZE_CLASS}>
        {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
        ) : (
            <AvatarFallback className={cn(aura ? "bg-transparent" : "bg-card text-card-foreground")}>
            {getInitials(user.name)}
            </AvatarFallback>
        )}
    </Avatar>
  );


  if (isCurrentUser && !aura) {
    return (
      <ItemContainer aria-label="Set your story or aura">
        <AvatarWithOverlap
          isRing={false}
          avatarContent={
             <Avatar className={IMAGE_SIZE_CLASS}>
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

  // Fallback for other users without an aura (no ring, no overlap emoji)
  // To maintain layout consistency, we can include an empty AvatarWithOverlap structure
  // or simplify if the layout doesn't strictly require the overlapContent space.
  // For simplicity now, directly render the avatar and name.
  return (
    <ItemContainer aria-label={user.name}>
       <div className={cn("relative", mainElementSize)}>
         <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden",
            IMAGE_SIZE_CLASS
          )}>
            <Avatar className={IMAGE_SIZE_CLASS}>
              {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
              ) : (
                  <AvatarFallback className="bg-card text-card-foreground">
                  {getInitials(user.name)}
                  </AvatarFallback>
              )}
            </Avatar>
          </div>
      </div>
      {nameText}
    </ItemContainer>
  );
}
