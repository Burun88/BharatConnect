"use client";

import type { Chat, UserAura } from '@/types';
import { AURA_OPTIONS } from '@/types';
import { mockUsers } from '@/lib/mock-data';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';

interface ChatItemProps {
  chat: Chat;
}

export default function ChatItem({ chat }: ChatItemProps) {
  const contactUser = chat.contactUserId ? mockUsers.find(u => u.id === chat.contactUserId) : null;
  const contactAura = contactUser?.currentAuraId ? AURA_OPTIONS.find(a => a.id === contactUser.currentAuraId) : null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  }
  
  const formatTimestamp = (timestamp: number | undefined) => {
    if (!timestamp) return '';
    return formatDistanceToNowStrict(new Date(timestamp), { addSuffix: true });
  };

  return (
    <Link 
      href={`/chat/${chat.id}`} 
      className="flex items-center p-3 hover:bg-accent/50 transition-colors rounded-lg"
    >
      <div className="relative mr-3">
        <Avatar className="w-12 h-12">
           {chat.avatarUrl && (
              <AvatarImage src={chat.avatarUrl} alt={chat.name} data-ai-hint="person avatar" />
           )}
          <AvatarFallback 
            className={cn(
              "bg-muted text-muted-foreground",
              contactAura?.gradient
            )}
            style={contactAura?.gradient ? { backgroundImage: contactAura.gradient.replace('bg-gradient-to-r ', 'linear-gradient(to right, ').replace(/from-(\w+)-(\d+)/g, 'var(--color-$1-$2)').replace(/via-(\w+)-(\d+)/g, ', var(--color-$1-$2)').replace(/to-(\w+)-(\d+)/g, ', var(--color-$1-$2)')+ ')' } : {}}
          >
            {chat.name ? getInitials(chat.name) : '??'}
          </AvatarFallback>
        </Avatar>
        {contactAura && (
          <span className="absolute bottom-0 right-0 block h-4 w-4 rounded-full border-2 border-background transform translate-x-1/4 translate-y-1/4 flex items-center justify-center text-xs">
            {contactAura.emoji}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h3 className={cn(
            "text-sm font-semibold text-foreground truncate",
            contactAura && "text-gradient-primary-accent"
          )}>
            {chat.name}
          </h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTimestamp(chat.lastMessage?.timestamp)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground truncate pr-2">
            {chat.lastMessage?.senderId === 'currentUser' && 'You: '}
            {chat.lastMessage?.text || 'No messages yet'}
          </p>
          {chat.unreadCount > 0 && (
            <Badge variant="default" className="px-2 py-0.5 text-xs bg-primary text-primary-foreground">
              {chat.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
