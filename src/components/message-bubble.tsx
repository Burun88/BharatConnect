
"use client";

import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isOutgoing: boolean;
}

export default function MessageBubble({ message, isOutgoing }: MessageBubbleProps) {
  // Use ml-auto for outgoing and mr-auto for incoming to align the bubble's container
  const alignmentClass = isOutgoing ? 'ml-auto' : 'mr-auto';
  const bubbleClass = isOutgoing ? 'message-bubble-outgoing' : 'message-bubble-incoming';

  const DeliveryStatusIcon = () => {
    if (!isOutgoing || message.type === 'system' || !message.status) return null;
    
    switch (message.status) {
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground/80" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground/80" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-400 group-hover:text-blue-300" />; // Using a specific blue for read
      default:
        return <Clock className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground/80" />; // Fallback, should not happen often
    }
  };
  
  if (message.type === 'system') {
    return (
      <div className="px-4 py-2 my-1 w-full">
        <p className={cn("message-bubble-system", "mx-auto max-w-xs rounded-md p-2")}>
          {message.text}
        </p>
      </div>
    );
  }

  return (
    // The alignmentClass (ml-auto/mr-auto) is applied here to the container of the bubble
    <div className={cn("flex flex-col max-w-[75%] my-1 group", alignmentClass)}>
      <div className={cn("px-3 py-2 shadow-md", bubbleClass)}>
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
        {/* Placeholder for media if type is image/file */}
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
