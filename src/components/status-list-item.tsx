
"use client";

import type { StatusUpdate, User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';

interface StatusListItemProps {
  statusUpdate: StatusUpdate;
  user: User;
  onClick?: () => void;
}

export default function StatusListItem({ statusUpdate, user, onClick }: StatusListItemProps) {
  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTimestamp = (timestamp: number | undefined) => {
    if (!timestamp) return '';
    // Show "Yesterday" if applicable, otherwise relative time
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
      <div className="relative mr-4">
        <div
          className={cn(
            "p-1 rounded-full",
            statusUpdate.viewedByCurrentUser
              ? "bg-transparent border-2 border-[hsl(var(--status-ring-viewed-border))]"
              : "bg-gradient-instabharat-ring"
          )}
        >
          <Avatar className="w-12 h-12 border-2 border-background">
            {user.avatarUrl && (
              <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
            )}
            <AvatarFallback className="bg-muted text-muted-foreground">
              {getInitials(user.name)}
            </AvatarFallback>
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
