
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
        className="flex flex-col items-center space-y-1 text-center cursor-pointer p-1"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        aria-label="Set your story or aura"
      >
        <div className="relative w-14 h-14">
          <Avatar className="w-full h-full">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
            ) : (
              <AvatarFallback className="bg-card text-card-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background">
            <Plus className="w-3 h-3 text-white" />
          </div>
        </div>
        <span className="text-xs text-white truncate w-16">Your Story</span>
      </div>
    );
  }

  // UI for users with an aura (gradient ring + emoji)
  if (aura) {
    return (
      <div
        className="flex flex-col items-center space-y-1 text-center cursor-pointer p-1"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        aria-label={user.name}
      >
        <div // Gradient ring container
          className={cn(
            "relative w-14 h-14 rounded-full flex items-center justify-center p-0.5", // p-0.5 for ring thickness
            aura.gradient // Apply gradient classes here
          )}
        >
          <div // Inner content area (emoji)
            className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden"
          >
            <span className="text-3xl">{aura.emoji}</span>
          </div>
        </div>
        <span className="text-xs text-white truncate w-16">
          {isCurrentUser ? "Your Aura" : user.name}
        </span>
      </div>
    );
  }

  // Default UI for other users without an aura (plain avatar)
  return (
    <div
      className="flex flex-col items-center space-y-1 text-center cursor-pointer p-1"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={user.name}
    >
      <Avatar className="w-14 h-14">
        {user.avatarUrl ? (
          <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
        ) : (
          <AvatarFallback className="bg-card text-card-foreground">
            {getInitials(user.name)}
          </AvatarFallback>
        )}
      </Avatar>
      <span className="text-xs text-white truncate w-16">{user.name}</span>
    </div>
  );
}
