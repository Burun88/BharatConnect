
"use client";

import type { StatusUpdate, User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { UserCircle2 } from 'lucide-react';

interface StatusListItemProps {
  statusUpdate: StatusUpdate;
  user: User;
  onClick?: () => void;
}

export default function StatusListItem({ statusUpdate, user, onClick }: StatusListItemProps) {
  const formatTimestamp = (timestamp: number | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return formatDistanceToNowStrict(date, { addSuffix: true });
  };

  return (
    <div
      className="flex items-center p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => onClick && (e.key === 'Enter' || e.key === ' ') && onClick()}
      aria-label={`View status from ${user.name}`}
    >
      <div className="relative mr-4 w-[60px] h-[60px]">
        {!statusUpdate.viewedByCurrentUser ? (
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent animate-spin-slow"
          />
        ) : (
          <div
            className="absolute inset-0 rounded-full border-2 border-[hsl(var(--status-ring-viewed-border))]"
          />
        )}
        <div className="absolute inset-[2px] rounded-full bg-background overflow-hidden">
          <Avatar className="w-full h-full">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
            ) : (
              <AvatarFallback className="bg-muted text-muted-foreground">
                <UserCircle2 className="w-10 h-10 text-muted-foreground" />
              </AvatarFallback>
            )}
          </Avatar>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground truncate">{user.name}</h3>
        <p className="text-xs text-muted-foreground truncate">
          {formatTimestamp(statusUpdate.timestamp)}
        </p>
      </div>
    </div>
  );
}
