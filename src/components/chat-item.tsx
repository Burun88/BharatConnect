
"use client";

import type { Chat } from '@/types';
import { AURA_OPTIONS } from '@/types'; 
// Removed mockUsers and mockCurrentUser import as contactUser info should come from chat.participants or chat.contactUserId mapping
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { UserCircle2, MailQuestion, CheckCircle, XCircle, Send } from 'lucide-react';

interface ChatItemProps {
  chat: Chat;
  currentUserId: string; // Added currentUserId
}

export default function ChatItem({ chat, currentUserId }: ChatItemProps) {
  // Determine contact user information from the chat object
  const contactUser = chat.participants.find(p => p.id !== currentUserId);
  const contactAura = contactUser?.currentAuraId ? AURA_OPTIONS.find(a => a.id === contactUser.currentAuraId) : null;

  const formatTimestamp = (timestamp: number | undefined) => {
    if (!timestamp) return '';
    return formatDistanceToNowStrict(new Date(timestamp), { addSuffix: true });
  };

  let subText = chat.lastMessage?.text || 'No messages yet';
  let subTextColor = 'text-muted-foreground';
  let specialBadge = null;

  if (chat.requestStatus === 'awaiting_action' && chat.requesterId !== currentUserId) {
    subText = chat.firstMessageTextPreview || "Wants to connect with you.";
    subTextColor = 'text-primary';
    specialBadge = <Badge variant="default" className="px-2 py-0.5 text-xs bg-gradient-to-r from-accent to-primary text-primary-foreground"><MailQuestion className="w-3 h-3 mr-1 inline-block"/>Request</Badge>;
  } else if (chat.requestStatus === 'pending' && chat.requesterId === currentUserId) {
    subText = chat.firstMessageTextPreview || "Request sent. Waiting for approval...";
    subTextColor = 'text-amber-500';
  } else if (chat.requestStatus === 'rejected') {
    if (chat.requesterId === currentUserId) { // Current user sent the request and it was rejected
        subText = `Your request to ${chat.name.replace(" (Wants to Connect)","").replace(" (Request Sent)","")} was rejected.`;
    } else { // Current user rejected the request
        subText = `You rejected chat request from ${chat.name.replace(" (Wants to Connect)","").replace(" (Request Sent)","")}.`;
    }
    subTextColor = 'text-destructive';
  }

  // Use chat.avatarUrl (which should be the contact's avatar for individual chats)
  // or fallback to contactUser's avatar if chat.avatarUrl is not directly set for the chat list item
  const displayAvatarUrl = chat.avatarUrl || contactUser?.avatarUrl;
  const displayName = chat.name.replace(" (Wants to Connect)","").replace(" (Request Sent)","");


  return (
    <Link
      href={`/chat/${chat.id}`}
      className="flex items-center p-3 transition-colors rounded-lg bg-background hover:bg-muted/50"
    >
      <div className="relative mr-3">
        <Avatar className="w-12 h-12">
           {displayAvatarUrl ? (
              <AvatarImage src={displayAvatarUrl} alt={displayName} data-ai-hint="person avatar" />
           ) : (
            <AvatarFallback className="bg-muted text-muted-foreground">
              <UserCircle2 className="w-8 h-8 text-muted-foreground" />
            </AvatarFallback>
           )}
        </Avatar>
        {contactAura && chat.requestStatus !== 'awaiting_action' && chat.requestStatus !== 'pending' && chat.requestStatus !== 'rejected' && (
          <span className="absolute bottom-0 right-0 block h-4 w-4 rounded-full border-2 border-background transform translate-x-1/4 translate-y-1/4 flex items-center justify-center text-xs">
            {contactAura.emoji}
          </span>
        )}
         {chat.requestStatus === 'awaiting_action' && chat.requesterId !== currentUserId && (
            <MailQuestion className="absolute bottom-0 right-0 w-5 h-5 text-primary bg-background rounded-full p-0.5 border-2 border-primary transform translate-x-1/4 translate-y-1/4" />
        )}
        {chat.requestStatus === 'pending' && chat.requesterId === currentUserId && (
            <Send className="absolute bottom-0 right-0 w-4 h-4 text-amber-500 bg-background rounded-full p-0.5 border-2 border-amber-500 transform translate-x-1/4 translate-y-1/4" />
        )}
        {chat.requestStatus === 'rejected' && (
             <XCircle className="absolute bottom-0 right-0 w-4 h-4 text-destructive bg-background rounded-full p-0.5 border-2 border-destructive transform translate-x-1/4 translate-y-1/4" />
        )}
         {(chat.requestStatus === 'accepted' || !chat.requestStatus || chat.requestStatus === 'none') && ( // Show green check for accepted or normal chats
             <CheckCircle className="absolute bottom-0 right-0 w-4 h-4 text-green-500 bg-background rounded-full p-0.5 border-2 border-green-500 transform translate-x-1/4 translate-y-1/4" />
        )}

      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {displayName}
          </h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTimestamp(chat.lastMessage?.timestamp)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className={cn("text-xs truncate pr-2", subTextColor)}>
            {chat.lastMessage?.senderId === currentUserId && chat.requestStatus !== 'pending' && chat.requestStatus !== 'awaiting_action' && chat.requestStatus !== 'rejected' && 'You: '}
            {subText}
          </p>
          {specialBadge ? specialBadge : (chat.unreadCount > 0 && chat.requestStatus !== 'awaiting_action' && chat.requestStatus !== 'pending' && chat.requestStatus !== 'rejected' && (
            <Badge variant="default" className="px-2 py-0.5 text-xs text-primary-foreground">
              {chat.unreadCount}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
