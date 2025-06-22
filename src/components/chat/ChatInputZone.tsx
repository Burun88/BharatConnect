
"use client";

import React, { useEffect, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, SmilePlus, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputZoneProps {
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onToggleEmojiPicker: () => void;
  isEmojiPickerOpen: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  isDisabled?: boolean; 
  justSelectedEmoji: boolean; // New prop
}

const MIN_TEXTAREA_HEIGHT = 40; 
const MAX_TEXTAREA_HEIGHT = 120; 

export default function ChatInputZone({
  newMessage,
  onNewMessageChange,
  onSendMessage,
  onToggleEmojiPicker,
  isEmojiPickerOpen,
  textareaRef,
  isDisabled = false,
  justSelectedEmoji, // Destructure new prop
}: ChatInputZoneProps) {
  
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height to shrink if needed
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(MIN_TEXTAREA_HEIGHT, Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  // Adjust height when newMessage changes (e.g., typing, clearing)
  useEffect(() => {
    adjustTextareaHeight();
  }, [newMessage, textareaRef]);


  const handleTextareaInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onNewMessageChange(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isDisabled) onSendMessage();
    }
  };
  
  const handleFocus = () => {
    // Only toggle (close) emoji picker if it's open AND an emoji wasn't just selected
    if (isEmojiPickerOpen && !justSelectedEmoji) {
      onToggleEmojiPicker(); 
    }
  };

  return (
    <div className="bg-background border-t border-border p-2.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isDisabled) onSendMessage();
        }}
        className="flex items-end space-x-2"
      >
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className={cn(
            "hover:bg-transparent flex-shrink-0", 
            isEmojiPickerOpen && "bg-accent/20 text-primary" 
          )}
          onClick={onToggleEmojiPicker}
          aria-pressed={isEmojiPickerOpen}
          aria-label="Toggle emoji picker"
          disabled={isDisabled}
        >
          <SmilePlus className={cn("w-5 h-5 text-muted-foreground", isEmojiPickerOpen && "text-primary")} />
        </Button>
        <div className="chat-input-wrapper flex-1"> 
          <Textarea
            ref={textareaRef}
            placeholder={isDisabled ? "Chat not active" : "Type a message..."}
            value={newMessage}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus} // Use modified handleFocus
            rows={1} 
            className="chat-input-textarea" 
            style={{ minHeight: `${MIN_TEXTAREA_HEIGHT}px` }} 
            disabled={isDisabled}
          />
        </div>
        {newMessage.trim() === '' ? (
          <>
            <Button variant="ghost" size="icon" type="button" className="hover:bg-transparent flex-shrink-0" onClick={() => { /* Attachment placeholder */ }} disabled={isDisabled}>
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" type="button" className="hover:bg-transparent flex-shrink-0" onClick={() => { /* Camera placeholder */ }} disabled={isDisabled}>
              <Camera className="w-5 h-5 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground w-10 h-10 flex-shrink-0" 
            disabled={isDisabled}
            onMouseDown={(e) => e.preventDefault()} // Prevent default focus steal
          >
            <Send className="w-5 h-5" />
          </Button>
        )}
      </form>
    </div>
  );
}
