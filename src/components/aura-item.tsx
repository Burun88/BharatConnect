
"use client";

import type { User, UserAura } from '@/types';
import { AURA_OPTIONS } from '@/types';
import Image from 'next/image';
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

  if (isCurrentUser && !aura) {
    // "Your Story" UI for the current user without an aura
    return (
      <div
        className="flex flex-col items-center space-y-1 text-center p-1"
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => onClick && e.key === 'Enter' && onClick?.()}
        aria-label="Set your story or aura"
      >
        <div className="relative w-20 h-20">
          <Avatar className="w-full h-full">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
            ) : (
              <AvatarFallback className="bg-card text-card-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background">
            <Plus className="w-4 h-4 text-white" />
          </div>
        </div>
        <span className="text-xs text-foreground truncate w-20">Your Story</span>
      </div>
    );
  }

  // UI for users with an aura (gradient ring + emoji)
  if (aura) {
    return (
      <div
        className="flex flex-col items-center space-y-1 text-center p-1"
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => onClick && e.key === 'Enter' && onClick?.()}
        aria-label={user.name}
      >
        <div // Gradient ring container
          className={cn(
            "relative w-20 h-20 rounded-full flex items-center justify-center p-1 animate-spin-slow", 
            aura.gradient 
          )}
        >
          <div // Inner content area (emoji)
            className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden"
          >
            <span className="text-5xl inline-block animate-spin-slow-counter">{aura.emoji}</span>
          </div>
        </div>
        <span className="text-xs text-foreground truncate w-20">
          {isCurrentUser ? "Your Aura" : user.name}
        </span>
      </div>
    );
  }

  // Default UI for other users without an aura (plain avatar)
  return (
    <div
      className="flex flex-col items-center space-y-1 text-center p-1"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick?.()}
      aria-label={user.name}
    >
      <Avatar className="w-20 h-20">
        {user.avatarUrl ? (
          <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
        ) : (
          <AvatarFallback className="bg-card text-card-foreground">
            {getInitials(user.name)}
          </AvatarFallback>
        )}
      </Avatar>
      <span className="text-xs text-foreground truncate w-20">{user.name}</span>
    </div>
  );
}
