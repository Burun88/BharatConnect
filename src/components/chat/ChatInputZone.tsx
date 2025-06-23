
"use client";

import React, { useEffect, type KeyboardEvent, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, SmilePlus, Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ChatInputZoneProps {
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onToggleEmojiPicker: () => void;
  onFileSelect: (file: File) => void;
  isEmojiPickerOpen: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  isDisabled?: boolean; 
  justSelectedEmoji: boolean;
  filePreviewUrl: string | null;
  onClearFileSelection: () => void;
}

const MIN_TEXTAREA_HEIGHT = 40; 
const MAX_TEXTAREA_HEIGHT = 120; 

export default function ChatInputZone({
  newMessage,
  onNewMessageChange,
  onSendMessage,
  onToggleEmojiPicker,
  onFileSelect,
  isEmojiPickerOpen,
  textareaRef,
  isDisabled = false,
  justSelectedEmoji,
  filePreviewUrl,
  onClearFileSelection
}: ChatInputZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(MIN_TEXTAREA_HEIGHT, Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

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
    if (isEmojiPickerOpen && !justSelectedEmoji) {
      onToggleEmojiPicker(); 
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please select a file smaller than 50MB.",
        });
        return;
      }
      onFileSelect(file);
    }
    if(event.target) event.target.value = '';
  };
  
  const canSend = !isDisabled && (newMessage.trim() !== '' || !!filePreviewUrl);


  return (
    <div className="bg-background border-t border-border p-2.5">
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/gif, image/*"
      />
      
      {filePreviewUrl && (
        <div className="relative w-24 h-24 p-2">
            <div className="relative w-full h-full rounded-md overflow-hidden border-2 border-border">
                <Image src={filePreviewUrl} alt="Image preview" layout="fill" objectFit="cover" />
                <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 text-white"
                    onClick={onClearFileSelection}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) onSendMessage();
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
            onFocus={handleFocus}
            rows={1} 
            className="chat-input-textarea" 
            style={{ minHeight: `${MIN_TEXTAREA_HEIGHT}px` }} 
            disabled={isDisabled}
          />
        </div>
        {canSend ? (
           <Button 
            type="submit" 
            size="icon" 
            className="rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground w-10 h-10 flex-shrink-0" 
            disabled={!canSend}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Send className="w-5 h-5" />
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="icon" type="button" className="hover:bg-transparent flex-shrink-0" onClick={handleAttachmentClick} disabled={isDisabled}>
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" type="button" className="hover:bg-transparent flex-shrink-0" onClick={() => { /* Camera placeholder */ }} disabled={isDisabled}>
              <Camera className="w-5 h-5 text-muted-foreground" />
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
