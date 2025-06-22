
"use client";

import type { Chat, UserAura } from '@/types'; 
import { AURA_OPTIONS } from '@/types'; 
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { UserCircle2, MailQuestion, CheckCircle, XCircle, Send, MessageSquareText } from 'lucide-react';

interface ChatItemProps {
  chat: Chat;
  currentUserId: string;
}

const ACCEPTED_ICON_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export default function ChatItem({ chat, currentUserId }: ChatItemProps) {
  const router = useRouter();
  const contactId = chat.participants.find(pId => pId !== currentUserId);
  const contactInfo = contactId ? chat.participantInfo?.[contactId] : null;

  const displayName = contactInfo?.name || chat.name.replace(" (Wants to Connect)","").replace(" (Request Sent)","") || "Chat";
  const displayAvatarUrl = contactInfo?.avatarUrl || chat.avatarUrl || undefined;

  const contactAuraId = contactInfo?.currentAuraId;
  const contactAura: UserAura | undefined = contactAuraId ? AURA_OPTIONS.find(a => a.id === contactAuraId) : undefined;
  
  const hasActiveStatus = contactInfo?.hasActiveUnviewedStatus || contactInfo?.hasActiveViewedStatus;

  const formatTimestamp = (timestamp: number | undefined) => {
    if (!timestamp) return '';
    return formatDistanceToNowStrict(new Date(timestamp), { addSuffix: true });
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    if (hasActiveStatus && contactId) {
      e.preventDefault(); // Prevents the parent Link from navigating
      router.push(`/status/view/${contactId}`);
    }
  };

  const isAcceptedChat = (chat.requestStatus === 'accepted' || !chat.requestStatus || chat.requestStatus === 'none');

  const isLastMessageVisuallyUnread =
    isAcceptedChat &&
    chat.unreadCount > 0 &&
    chat.lastMessage &&
    chat.lastMessage.senderId !== currentUserId;
    
  let subText: string = chat.lastMessage?.text || 'No messages yet';
  
  let subTextColor = 'text-muted-foreground';
  let specialBadge = null;
  let statusIconOverlay = null; 

  if (chat.requestStatus === 'awaiting_action' && chat.requesterId !== currentUserId) {
    subText = chat.firstMessageTextPreview || "Wants to connect with you.";
    subTextColor = 'text-primary';
    specialBadge = <Badge variant="default" className="px-2 py-0.5 text-xs bg-gradient-to-r from-accent to-primary text-primary-foreground"><MailQuestion className="w-3 h-3 mr-1 inline-block"/>Request</Badge>;
    statusIconOverlay = <MailQuestion className="absolute bottom-0 right-0 w-5 h-5 text-primary bg-background rounded-full p-0.5 border-2 border-primary transform translate-x-1/4 translate-y-1/4" />;
  } else if (chat.requestStatus === 'pending' && chat.requesterId === currentUserId) {
    subText = chat.firstMessageTextPreview || "Request sent. Waiting for approval...";
    subTextColor = 'text-amber-500';
    statusIconOverlay = <Send className="absolute bottom-0 right-0 w-4 h-4 text-amber-500 bg-background rounded-full p-0.5 border-2 border-amber-500 transform translate-x-1/4 translate-y-1/4" />;
  } else if (chat.requestStatus === 'rejected') {
    if (chat.requesterId === currentUserId) {
        subText = `Your request to ${displayName} was not accepted.`;
    } else {
        subText = `You chose not to connect with ${displayName}.`;
    }
    subTextColor = 'text-destructive';
    statusIconOverlay = <XCircle className="absolute bottom-0 right-0 w-4 h-4 text-destructive bg-background rounded-full p-0.5 border-2 border-destructive transform translate-x-1/4 translate-y-1/4" />;
  } else if (isAcceptedChat) {
    if (isLastMessageVisuallyUnread) {
      subTextColor = 'text-foreground font-semibold';
      statusIconOverlay = <MessageSquareText className="absolute bottom-0 right-0 w-4 h-4 text-primary bg-background rounded-full p-0.5 border-2 border-primary transform translate-x-1/4 translate-y-1/4" />;
    } else if (chat.acceptedTimestamp && (Date.now() - chat.acceptedTimestamp < ACCEPTED_ICON_DURATION_MS)) {
      statusIconOverlay = <CheckCircle className="absolute bottom-0 right-0 w-4 h-4 text-green-500 bg-background rounded-full p-0.5 border-2 border-green-500 transform translate-x-1/4 translate-y-1/4" />;
    }
  }

  // Status Ring Logic
  let statusRingClass = "";
  if (contactInfo?.hasActiveUnviewedStatus) {
    statusRingClass = "ring-2 ring-primary ring-offset-background ring-offset-2";
  } else if (contactInfo?.hasActiveViewedStatus) {
    statusRingClass = "ring-2 ring-muted-foreground/50 ring-offset-background ring-offset-2";
  }

  return (
    <Link
      href={`/chat/${chat.id}`}
      className={cn(
        "flex items-center p-3 transition-colors rounded-lg",
        "bg-background hover:bg-muted/30"
      )}
    >
      <div 
        className="relative mr-3"
        onClick={handleAvatarClick}
        role={hasActiveStatus ? "button" : undefined}
        aria-label={hasActiveStatus ? `View status of ${displayName}` : undefined}
        tabIndex={hasActiveStatus ? 0 : -1}
        onKeyDown={(e) => {
          if (hasActiveStatus && contactId && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              router.push(`/status/view/${contactId}`);
          }
        }}
      >
        <div className={cn(hasActiveStatus ? "cursor-pointer" : "cursor-default")}>
          <Avatar className={cn("w-12 h-12", statusRingClass)}>
             <AvatarImage src={displayAvatarUrl || undefined} alt={displayName} data-ai-hint="person avatar"/>
             <AvatarFallback className="bg-muted text-muted-foreground">
               <UserCircle2 className="w-8 h-8 text-muted-foreground" />
             </AvatarFallback>
          </Avatar>
          {statusIconOverlay} 
          {isAcceptedChat && contactAura && (
              <span 
                  className="absolute bottom-0 left-0 w-5 h-5 text-xs rounded-full flex items-center justify-center border-2 border-background shadow-md bg-card transform -translate-x-1/4 translate-y-1/4 p-0.5"
                  title={`${displayName} is feeling ${contactAura.name}`}
              >
                  <Image src={contactAura.iconUrl} alt={contactAura.name} width={12} height={12} className="w-full h-full object-contain" />
              </span>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {displayName}
          </h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTimestamp(chat.lastMessage?.timestamp || chat.updatedAt)}
          </span>
        </div>
        <div className="flex justify-between items-center">
            <div className="flex items-center space-x-1 flex-1 min-w-0">
                <p className={cn("text-xs truncate", subTextColor)}>
                    {isAcceptedChat && chat.lastMessage?.senderId === currentUserId && chat.lastMessage?.type !== 'system' && 'You: '}
                    {subText}
                </p>
            </div>
          {specialBadge ? specialBadge :
            (isAcceptedChat && chat.unreadCount > 0 && ( 
            <Badge variant="default" className="px-1.5 py-0.5 text-xs text-primary-foreground bg-primary min-w-[20px] flex items-center justify-center ml-2">
              {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
