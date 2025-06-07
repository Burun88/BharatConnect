
"use client";

import type { User } from '@/types';
import { AURA_OPTIONS } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';

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

  // Main avatar/ring is w-16 h-16 (64px)
  // Emoji/Plus circle is w-7 h-7 (28px)
  const mainElementSize = "w-16 h-16";
  const smallCircleSize = "w-7 h-7";
  const smallCircleIconSize = "w-4 h-4"; // For Plus icon
  const smallCircleEmojiFontSize = "text-sm"; // For emoji character

  const ItemContainer: React.FC<{ children: React.ReactNode; 'aria-label': string }> = ({ children, ...props }) => (
    <div
      className="flex flex-col items-center space-y-1 text-center p-1 shrink-0 cursor-pointer" // Added p-1 for spacing around, space-y-1 for spacing between avatar&text
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick?.()}
      aria-label={props['aria-label']}
    >
      {children}
    </div>
  );

  // Common structure for the main avatar/ring and the overlapping circle
  const AvatarWithOverlap: React.FC<{
    avatarContent: React.ReactNode;
    overlapContent?: React.ReactNode;
    isRing?: boolean;
    ringGradient?: string;
  }> = ({ avatarContent, overlapContent, isRing, ringGradient }) => (
    <div className={cn("relative", mainElementSize)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center",
          mainElementSize,
          isRing ? "p-1 animate-spin-slow" : "",
          isRing && ringGradient ? ringGradient : ""
        )}
      >
        {avatarContent}
      </div>
      {overlapContent && (
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center border-2 border-background",
            smallCircleSize,
            // Position the top of the small circle 56px from the top of the 64px main element.
            // This makes the top 8px of the 28px small circle overlap.
             "top-[calc(theme(spacing.16)-theme(spacing.2))]" // top-14 equivalent (64px - 8px = 56px)
          )}
        >
          {overlapContent}
        </div>
      )}
    </div>
  );

  const nameText = (
    <span className="text-xs text-foreground truncate w-16 text-center mt-0.5">
      {isCurrentUser ? (aura ? "Your Aura" : "Your Story") : user.name}
    </span>
  );

  if (isCurrentUser && !aura) {
    // "Your Story" UI: Avatar, then Plus in an overlapping circle
    return (
      <ItemContainer aria-label="Set your story or aura">
        <AvatarWithOverlap
          avatarContent={
            <Avatar className={cn("w-full h-full", !isRing && "bg-card")}>
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
    // Aura UI: Avatar in spinning gradient ring, then Emoji in an overlapping circle
    return (
      <ItemContainer aria-label={user.name}>
        <AvatarWithOverlap
          isRing
          ringGradient={aura.gradient}
          avatarContent={
            <Avatar className="w-full h-full bg-background"> {/* bg-background to cover gradient for image */}
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
              ) : (
                <AvatarFallback className="bg-background text-card-foreground"> {/* Also bg-background */}
                  {getInitials(user.name)}
                </AvatarFallback>
              )}
            </Avatar>
          }
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

  // Default UI (other users, no aura): Avatar, no overlapping circle
  return (
    <ItemContainer aria-label={user.name}>
      <AvatarWithOverlap
        avatarContent={
          <Avatar className={cn(mainElementSize, "bg-card")}> {/* Ensure avatar takes full mainElementSize */}
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
