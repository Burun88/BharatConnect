
"use client";

import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import MessageBubble from '@/components/message-bubble';
import TypingIndicatorBubble from '@/components/chat/TypingIndicatorBubble';
import type { Message } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageAreaProps {
  messages: Message[];
  currentUserId: string;
  contactId: string | null;
  dynamicPaddingBottom: number;
  isContactTyping: boolean;
  onRetryUpload: (clientTempId: string) => void;
}

const SCROLL_NEAR_BOTTOM_THRESHOLD = 150; 

export default function MessageArea({
  messages,
  currentUserId,
  contactId,
  dynamicPaddingBottom,
  isContactTyping,
  onRetryUpload,
}: MessageAreaProps) {
  const messageListContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);
  const [unreadWhileScrolledUp, setUnreadWhileScrolledUp] = useState(0);
  
  const wasAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);

  const handleScroll = () => {
    const container = messageListContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < SCROLL_NEAR_BOTTOM_THRESHOLD;
    
    if (isNearBottom) {
      setUnreadWhileScrolledUp(0);
    }
    wasAtBottomRef.current = isNearBottom;
    setShowScrollToBottomButton(!isNearBottom && scrollHeight > clientHeight);
  };
  
  const handleScrollButtonClick = () => {
    const container = messageListContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      setUnreadWhileScrolledUp(0);
    }
  };

  useEffect(() => {
    const newMessagesCount = messages.length - prevMessagesLengthRef.current;
    const newMessages = messages.slice(-newMessagesCount);

    if (showScrollToBottomButton && newMessagesCount > 0) {
      const newIncomingMessages = newMessages
        .filter(msg => msg.senderId !== currentUserId && !msg.clientTempId).length;
      
      if (newIncomingMessages > 0) {
        setUnreadWhileScrolledUp(prev => prev + newIncomingMessages);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, showScrollToBottomButton, currentUserId]);

  useLayoutEffect(() => {
    const container = messageListContainerRef.current;
    if (container && wasAtBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isContactTyping]);

  useEffect(() => {
    const container = messageListContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (wasAtBottomRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.unobserve(container);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="flex-1 relative overflow-hidden">
      <div
        ref={messageListContainerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto hide-scrollbar p-2 space-y-2"
        style={{ paddingBottom: `${dynamicPaddingBottom}px` }}
      >
        {messages.length === 0 && !isContactTyping && (
          <div className="px-4 py-2 my-1 w-full animate-fade-in-scale-up">
            <p className={cn("mx-auto max-w-sm rounded-md p-2 text-center text-xs", "flex items-center justify-center bg-muted text-muted-foreground")}>
              <Lock className="w-3 h-3 mr-1.5 flex-shrink-0" />
              <span className="text-balance">Messages are end-to-end encrypted.</span>
            </p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id} 
            message={msg}
            isOutgoing={msg.senderId === currentUserId}
            contactId={contactId}
            currentUserId={currentUserId}
            onRetry={onRetryUpload}
          />
        ))}
        {isContactTyping && (
            <div className="flex flex-col max-w-[70%] my-1 mr-auto">
                 <TypingIndicatorBubble />
            </div>
        )}
      </div>

      {showScrollToBottomButton && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-4 bottom-4 w-10 h-10 rounded-full shadow-lg bg-background/80 backdrop-blur-sm border-border hover:bg-muted z-20 transition-opacity duration-300 animate-fade-in-scale-up"
          onClick={handleScrollButtonClick}
          aria-label="Scroll to bottom"
          style={{ bottom: `calc(1rem + ${dynamicPaddingBottom}px)` }}
        >
          <ChevronDown className="w-5 h-5" />
          {unreadWhileScrolledUp > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 justify-center rounded-full">
              {unreadWhileScrolledUp > 9 ? '9+' : unreadWhileScrolledUp}
            </Badge>
          )}
        </Button>
      )}
    </div>
  );
}
