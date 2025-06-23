
"use client";

import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import MessageBubble from '@/components/message-bubble';
import TypingIndicatorBubble from '@/components/chat/TypingIndicatorBubble';
import type { Message } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Lock, UploadCloud, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface MessageAreaProps {
  messages: Message[];
  currentUserId: string;
  contactId: string | null;
  dynamicPaddingBottom: number;
  isContactTyping: boolean;
  isUploading: boolean;
  uploadProgress: number;
}

const SCROLL_NEAR_BOTTOM_THRESHOLD = 150; 

export default function MessageArea({
  messages,
  currentUserId,
  contactId,
  dynamicPaddingBottom,
  isContactTyping,
  isUploading,
  uploadProgress,
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
    if (showScrollToBottomButton && newMessagesCount > 0) {
      const newIncomingMessages = messages
        .slice(-newMessagesCount)
        .filter(msg => msg.senderId !== currentUserId).length;
      
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
  }, [messages, isContactTyping, isUploading]);

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
        {messages.length === 0 && !isContactTyping && !isUploading && (
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
          />
        ))}
        {isContactTyping && (
            <div className="flex flex-col max-w-[70%] my-1 mr-auto">
                 <TypingIndicatorBubble />
            </div>
        )}
        {isUploading && (
          <div className="flex flex-col items-center justify-center p-4 space-y-3 bg-muted rounded-lg m-2 animate-pulse">
            <UploadCloud className="w-8 h-8 text-primary" />
            <p className="text-sm font-medium text-foreground">Sending encrypted file...</p>
            <Progress value={uploadProgress} className="w-full h-2" />
            <p className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</p>
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
