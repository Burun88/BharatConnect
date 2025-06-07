
"use client";

import type { User, UserAura } from '@/types';
import { AURA_OPTIONS } from '@/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AuraItemProps {
  user: User;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

export default function AuraItem({ user, isCurrentUser = false, onClick }: AuraItemProps) {
  const aura = AURA_OPTIONS.find(a => a.id === user.currentAuraId);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center space-y-1 text-center cursor-pointer p-2 rounded-lg transition-colors", // Removed hover:bg-accent/50
        isCurrentUser && "border-2 border-primary rounded-lg"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={isCurrentUser ? `Set your aura` : `View ${user.name}'s aura`}
    >
      <div className={cn(
        "relative w-14 h-14 rounded-full flex items-center justify-center",
        aura?.gradient && "p-0.5", // Padding for gradient border
        aura?.gradient // Apply gradient class string
      )}>
        <Avatar className={cn("w-full h-full", aura?.gradient && "border-2 border-background")}>
          {user.avatarUrl && !aura ? (
             <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
          ) : null}
          {aura ? (
            <span className="text-3xl flex items-center justify-center w-full h-full bg-background rounded-full">{aura.emoji}</span>
          ) : (
            <AvatarFallback className="bg-muted text-muted-foreground">
              {user.name ? getInitials(user.name) : '??'}
            </AvatarFallback>
          )}
        </Avatar>
      </div>
      <span className="text-xs text-white truncate w-16"> {/* Changed text-foreground to text-white */}
        {isCurrentUser ? "Your Aura" : user.name}
      </span>
    </div>
  );
}
