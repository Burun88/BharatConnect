
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

  const mainElementSize = "w-20 h-20"; // Changed from w-16 h-16
  const smallCircleSize = "w-7 h-7"; 
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
    avatarContent: React.ReactNode;
    overlapContent?: React.ReactNode;
    isRing?: boolean;
    ringGradient?: string;
  }> = ({ avatarContent, overlapContent, isRing, ringGradient }) => {
    return (
      <div className={cn("relative", mainElementSize)}>
        {isRing && ringGradient && (
          <>
            <div
              className={cn(
                "absolute inset-0 rounded-full animate-spin-slow",
                ringGradient
              )}
            />
            <div className="relative w-full h-full rounded-full p-1.5"> 
              <div className="w-full h-full rounded-full bg-background overflow-hidden">
                {React.cloneElement(avatarContent as React.ReactElement, { className: cn((avatarContent as React.ReactElement).props.className, "w-full h-full") })}
              </div>
            </div>
          </>
        )}
        {!isRing && (
          React.cloneElement(avatarContent as React.ReactElement, { className: cn((avatarContent as React.ReactElement).props.className, mainElementSize) })
        )}

        {overlapContent && (
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center border-2 border-background",
              smallCircleSize,
              "top-[calc(theme(spacing.20)-theme(spacing.2))]" // Changed from spacing.16
            )}
          >
            {overlapContent}
          </div>
        )}
      </div>
    );
  };


  const nameText = (
    <span className={cn("text-xs text-foreground truncate w-20 text-center mt-0.5", mainElementSize === "w-20 h-20" ? "w-20" : "w-16")}> {/* Changed from w-16 */}
      {isCurrentUser ? (aura ? "Your Aura" : "Your Story") : user.name}
    </span>
  );

  const currentUserAvatar = (
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
    return (
      <ItemContainer aria-label="Set your story or aura">
        <AvatarWithOverlap
          isRing={false}
          avatarContent={
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

  return (
    <ItemContainer aria-label={user.name}>
      <AvatarWithOverlap
        isRing={false}
        avatarContent={ 
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
