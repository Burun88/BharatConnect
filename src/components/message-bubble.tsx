
"use client";

import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Clock, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isOutgoing: boolean;
  contactId: string | null; // ID of the other participant in a 1-on-1 chat
}

export default function MessageBubble({ message, isOutgoing, contactId }: MessageBubbleProps) {
  const alignmentClass = isOutgoing ? 'ml-auto' : 'mr-auto';
  const bubbleClass = isOutgoing ? 'message-bubble-outgoing' : 'message-bubble-incoming';

  // Apply animation only if it's an optimistic message (has clientTempId but no firestoreId yet)
  const applyAnimation = !!message.clientTempId && !message.firestoreId;

  const DeliveryStatusIcon = () => {
    if (!isOutgoing || message.type === 'system') return null;
    
    const isReadByContact = contactId && message.readBy?.includes(contactId);

    if (isReadByContact) {
      return <CheckCheck className="w-3 h-3 text-blue-400 group-hover:text-blue-300" />;
    }
    // If firestoreId exists, it means delivered to server.
    // If not, it's still pending (optimistic).
    if (message.firestoreId) { 
        return <Check className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground/80" />;
    }
    return <Clock className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground/80" />;
  };
  
  if (message.type === 'system') {
    return (
      <div className="px-4 py-2 my-1 w-full animate-fade-in-scale-up">
        <p className={cn("message-bubble-system", "mx-auto max-w-xs rounded-md p-2")}>
          {message.text}
        </p>
      </div>
    );
  }

  const messageContent = message.error === 'DECRYPTION_FAILED' ? (
    <div className="flex items-center text-destructive-foreground/80 italic">
        <ShieldAlert className="w-4 h-4 mr-2" />
        <span>{message.text || 'Decryption failed'}</span>
    </div>
  ) : (
    <p className="text-sm whitespace-pre-wrap break-words break-all">{message.text}</p>
  );

  return (
    <div className={cn("flex flex-col max-w-[70%] my-1 group", alignmentClass, applyAnimation ? "animate-fade-in-scale-up" : "")}>
      <div className={cn(
          "px-3 py-2",
          bubbleClass,
          message.error === 'DECRYPTION_FAILED' && 'bg-destructive/50 border border-destructive'
        )}>
        {messageContent}
        {message.type === 'image' && message.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.mediaUrl} alt="Shared media" className="mt-2 rounded-md max-w-full h-auto" data-ai-hint="chat media" />
        )}
      </div>
      <div className={cn("flex items-center mt-0.5 px-1", isOutgoing ? 'justify-end' : 'justify-start')}>
        <span className="text-xs text-muted-foreground">
          {format(new Date(message.timestamp), 'p')}
        </span>
        {isOutgoing && <span className="ml-1"><DeliveryStatusIcon /></span>}
      </div>
    </div>
  );
}
