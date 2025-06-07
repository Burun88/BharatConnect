
"use client";

import type { User } from '@/types';
import { AURA_OPTIONS } from '@/types';
// Removed unused Image import
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
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  }

  const avatarSizeClasses = "w-16 h-16";
  const smallCircleClasses = "w-7 h-7 rounded-full flex items-center justify-center border-2 border-background";
  const emojiInCircleClasses = "text-sm"; 
  const nameTextClasses = "text-xs text-foreground truncate w-16"; // w-16 to match avatar width

  // Wrapper for common layout and click handling
  const ItemContainer: React.FC<{ children: React.ReactNode; 'aria-label': string }> = ({ children, ...props }) => (
    <div
      className="flex flex-col items-center space-y-1.5 text-center p-1 w-[76px] shrink-0 cursor-pointer" // w-[76px] accommodates w-16 avatar + p-1 on ring + p-1 on container
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick?.()}
      aria-label={props['aria-label']}
    >
      {children}
    </div>
  );

  if (isCurrentUser && !aura) {
    // "Your Story" UI: Avatar, then Plus in a circle, then "Your Story" text
    return (
      <ItemContainer aria-label="Set your story or aura">
        <Avatar className={cn(avatarSizeClasses)}>
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
          ) : (
            <AvatarFallback className="bg-card text-card-foreground">
              {getInitials(user.name)}
            </AvatarFallback>
          )}
        </Avatar>
        <div className={cn(smallCircleClasses, "bg-primary")}>
          <Plus className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className={nameTextClasses}>Your Story</span>
      </ItemContainer>
    );
  }

  if (aura) {
    // Aura UI: Avatar in spinning gradient ring, then Emoji in a circle, then Name/Your Aura text
    return (
      <ItemContainer aria-label={user.name}>
        <div // Gradient ring container
          className={cn(
            "relative rounded-full flex items-center justify-center p-1 animate-spin-slow", 
            avatarSizeClasses, // This div itself is w-16 h-16, p-1 is for ring thickness
            aura.gradient 
          )}
        >
          <Avatar className="w-full h-full"> {/* Avatar takes full space of the p-1 padded parent */}
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
            ) : (
              <AvatarFallback className="bg-background text-card-foreground"> {/* bg-background to cover gradient */}
                {getInitials(user.name)}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
        <div className={cn(smallCircleClasses, "bg-card")}>
            <span className={emojiInCircleClasses}>{aura.emoji}</span>
        </div>
        <span className={nameTextClasses}>
          {isCurrentUser ? "Your Aura" : user.name}
        </span>
      </ItemContainer>
    );
  }

  // Default UI (other users, no aura): Avatar, empty space (for alignment), then Name text
  return (
    <ItemContainer aria-label={user.name}>
      <Avatar className={cn(avatarSizeClasses)}>
        {user.avatarUrl ? (
          <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
        ) : (
          <AvatarFallback className="bg-card text-card-foreground">
            {getInitials(user.name)}
          </AvatarFallback>
        )}
      </Avatar>
      {/* Placeholder div to maintain consistent spacing with items that have an emoji/plus circle */}
      <div className={cn(smallCircleClasses, "invisible")} aria-hidden="true"></div>
      <span className={nameTextClasses}>{user.name}</span>
    </ItemContainer>
  );
}
