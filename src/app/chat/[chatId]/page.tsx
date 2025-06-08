
"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import MessageBubble from '@/components/message-bubble';
import type { Message, User, Chat } from '@/types';
import { AURA_OPTIONS } from '@/types';
import { mockMessagesData, mockUsers, mockChats, mockCurrentUser } from '@/lib/mock-data';
import { ArrowLeft, Paperclip, Send, SmilePlus, MoreVertical, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import EmojiPicker from '@/components/emoji-picker';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [chatDetails, setChatDetails] = useState<Chat | null>(null);
  const [contact, setContact] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null); // For the scrollable messages area
  // chatInputFooterRef will be implicitly the div with id="chat-input-footer"

  useEffect(() => {
    // Simulate data fetching
    setTimeout(() => {
      const currentChat = mockChats.find(c => c.id === chatId);
      if (currentChat) {
        setChatDetails(currentChat);
        const contactUser = currentChat.contactUserId ? mockUsers.find(u => u.id === currentChat.contactUserId) : null;
        setContact(contactUser);
        const chatMessages = mockMessagesData[chatId] || [];
        setMessages(chatMessages);
      }
      setIsLoading(false);
    }, 1000);
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Step 4: Use Virtual Keyboard Overlay API (Chrome)
  useEffect(() => {
    if ('virtualKeyboard' in navigator) {
      try {
        (navigator as any).virtualKeyboard.overlaysContent = true;
      } catch (e) {
        console.warn("Failed to set virtualKeyboard.overlaysContent", e);
      }
    }
  }, []);

  // Step 3 & Combined Resize Logic: Apply Visual Viewport Resize Listener + ResizeObserver for input bar
  useEffect(() => {
    const chatInputFooterEl = document.getElementById('chat-input-footer');
    const messagesContainerEl = messagesContainerRef.current;

    if (!chatInputFooterEl || !messagesContainerEl || !window.visualViewport) {
      return;
    }

    const initialInputFooterHeight = chatInputFooterEl.offsetHeight;

    const handleVisualViewportResize = () => {
      if (!window.visualViewport) return;
      // Calculate the height of the keyboard/obscured area
      const keyboardHeight = window.innerHeight - window.visualViewport.height;
      const actualKeyboardOffset = Math.max(0, keyboardHeight);

      // Apply paddingBottom to the chat input footer itself, as per user plan
      // This makes the footer taller, pushing its content (textarea) up
      chatInputFooterEl.style.paddingBottom = `${actualKeyboardOffset}px`;
      
      // The message container's padding bottom should clear the new effective height of the input footer
      // Since input footer height changes due to its own padding, ResizeObserver handles this part.
    };
    
    const updateMessagesContainerPadding = () => {
        messagesContainerEl.style.paddingBottom = `${chatInputFooterEl.offsetHeight}px`;
        // Scroll messages to bottom only if textarea is focused and keyboard is likely up
        // (actualKeyboardOffset being > 0 from visualViewport is a better check, but that's in a different scope)
        // A simpler heuristic: if textarea has focus, scroll.
        if (document.activeElement === textareaRef.current) {
           messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
        }
    };
    
    window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    handleVisualViewportResize(); // Initial call to set padding

    const resizeObserver = new ResizeObserver(() => {
        updateMessagesContainerPadding();
    });
    resizeObserver.observe(chatInputFooterEl);
    
    updateMessagesContainerPadding(); // Initial call for message container padding

    return () => {
      window.visualViewport?.removeEventListener('resize', handleVisualViewportResize);
      resizeObserver.disconnect();
      // Reset styles on cleanup
      chatInputFooterEl.style.paddingBottom = '0px';
      if (messagesContainerRef.current) {
        messagesContainerRef.current.style.paddingBottom = `${initialInputFooterHeight}px`; 
      }
    };
  }, [messagesContainerRef, textareaRef]); // Rerun if refs change (should not happen often)

  // iOS Safari Fallback
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const virtualKeyboardProbablyNotActive = !(('virtualKeyboard' in navigator) && (navigator as any).virtualKeyboard?.overlaysContent);

    if (isIOS && virtualKeyboardProbablyNotActive) {
      const textareaElement = textareaRef.current;
      const focusHandler = () => document.body.classList.add('keyboard-open');
      const blurHandler = () => document.body.classList.remove('keyboard-open');

      textareaElement?.addEventListener('focus', focusHandler);
      textareaElement?.addEventListener('blur', blurHandler);

      return () => {
        textareaElement?.removeEventListener('focus', focusHandler);
        textareaElement?.removeEventListener('blur', blurHandler);
        document.body.classList.remove('keyboard-open'); // Cleanup class
      };
    }
  }, [textareaRef]);


  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewMessage(prevMessage => prevMessage + emoji);
  }, []);

  const showComingSoonToastOptions = () => {
    toast({
      title: "Hold Tight, Connecting Soon! 🚀",
      description: "Our team is busy crafting this awesome feature for you. It'll be ready before your next chai break! Stay tuned with BharatConnect! 🇮🇳✨",
    });
  };

  const toggleEmojiPicker = () => {
    const openingEmojiPicker = !isEmojiPickerOpen;
    setIsEmojiPickerOpen(openingEmojiPicker);
    if (openingEmojiPicker) { 
        textareaRef.current?.blur(); 
    } else {
        textareaRef.current?.focus(); 
    }
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const messageToSend: Message = {
      id: `msg${Date.now()}`,
      chatId: chatId,
      senderId: 'currentUser',
      text: newMessage.trim(),
      timestamp: Date.now(),
      status: 'sent',
      type: 'text',
    };
    setMessages(prevMessages => [...prevMessages, messageToSend]);
    setNewMessage('');
    
    if (isEmojiPickerOpen) {
        setIsEmojiPickerOpen(false);
    }
    textareaRef.current?.focus(); 

    if (contact) {
        setTimeout(() => {
            const replyMessage: Message = {
                id: `reply${Date.now()}`,
                chatId: chatId,
                senderId: contact.id,
                text: `Thanks for your message! (mock reply from ${contact.name})`,
                timestamp: Date.now(),
                type: 'text',
            };
            setMessages(prevMessages => [...prevMessages, replyMessage]);
        }, 1500);
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "File Selected",
        description: `You selected: ${file.name}. Sending files coming soon!`,
      });
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleCameraClick = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      toast({
        title: "Camera Access Granted! 📸",
        description: "Camera is ready. Sending photos/videos coming soon!",
      });
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: 'destructive',
        title: "Camera Access Denied 🙁",
        description: "Please enable camera permissions in your browser settings to use this feature.",
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  }

  const contactAura = contact?.currentAuraId ? AURA_OPTIONS.find(a => a.id === contact.currentAuraId) : null;
  const contactStatus = contactAura ? `Feeling ${contactAura.name} ${contactAura.emoji}` : contact?.status;


  if (isLoading) {
    // Skeleton remains similar, no major changes needed here for the plan
    return (
      <div className="flex flex-col h-[calc(var(--vh,1vh)*100)] bg-background">
        <header className="sticky top-0 z-30 flex items-center p-3 border-b bg-background h-16">
          <Skeleton className="w-8 h-8 rounded-full mr-2" />
          <Skeleton className="w-10 h-10 rounded-full mr-3" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="w-2/4 h-4" />
            <Skeleton className="w-1/3 h-3" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full ml-auto" />
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <Skeleton className={`w-3/5 h-12 rounded-lg ${i % 2 === 0 ? 'bg-secondary' : 'bg-primary/80'}`} />
                </div>
            ))}
        </div>
         <div className="sticky bottom-0 z-20 bg-background p-2.5 border-t">
            <Skeleton className="w-full h-10 rounded-full" />
        </div>
      </div>
    );
  }

  if (!chatDetails || !contact) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-muted-foreground">Chat not found.</p>
        <Button variant="link" onClick={() => router.push('/')}>Go to Chats</Button>
      </div>
    );
  }

  return (
    // Step 5 & 6: Layout Structure and Styling (using Tailwind)
    <div className="flex flex-col h-[calc(var(--vh,1vh)*100)] bg-background"> {/* main-container */}
      <header className="sticky top-0 z-30 flex items-center p-2.5 border-b bg-background h-16"> {/* header */}
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10 mr-3">
          {contact.avatarUrl && (
            <AvatarImage src={contact.avatarUrl} alt={contact.name} data-ai-hint="person avatar"/>
          )}
          <AvatarFallback className={cn(contactAura?.gradient)}>
            {contactAura ? contactAura.emoji : getInitials(contact.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold">{contact.name}</h2>
          <p className="text-xs text-muted-foreground truncate">{contactStatus || 'Offline'}</p>
        </div>
        <Button variant="ghost" size="icon" className="ml-auto" onClick={showComingSoonToastOptions}>
          <MoreVertical className="w-5 h-5" />
        </Button>
      </header>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-2"> {/* messages */}
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} isOutgoing={msg.senderId === 'currentUser'} />
          ))}
          <div ref={messagesEndRef} />
      </div>
      
      {/* This div is the 'chat-input' from the plan, also handling emoji picker */}
      <div id="chat-input-footer" className={cn(
        "sticky bottom-0 z-20 bg-background border-t chat-input-ios-fallback",
        "pb-[env(safe-area-inset-bottom)]" // Add safe area padding for iOS notch devices
        )}>
        <footer className="flex items-end space-x-2 p-2.5 flex-shrink-0">
           <Button
            variant="ghost"
            size="icon"
            type="button"
            className={cn("hover:bg-transparent", isEmojiPickerOpen && "bg-accent/20 text-primary")}
            onClick={toggleEmojiPicker}
            aria-pressed={isEmojiPickerOpen}
            aria-label="Toggle emoji picker"
          >
            <SmilePlus className={cn("w-5 h-5 text-muted-foreground", isEmojiPickerOpen && "text-primary")} />
          </Button>
          <Textarea
            ref={textareaRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
            }}
            onFocus={() => {
              if(isEmojiPickerOpen) setIsEmojiPickerOpen(false);
            }}
            rows={1}
            className="flex-1 resize-none min-h-[40px] max-h-[100px] rounded-full px-4 py-2.5 leading-tight self-center"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e as any);
              }
            }}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,text/plain,audio/*"
          />
          {newMessage.trim() === '' ? (
            <>
             <Button variant="ghost" size="icon" type="button" className="hover:bg-transparent" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" type="button" className="hover:bg-transparent" onClick={handleCameraClick}>
                <Camera className="w-5 h-5 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <Button type="submit" size="icon" onClick={handleSendMessage} className="rounded-full bg-primary text-primary-foreground w-10 h-10 flex-shrink-0">
              <Send className="w-5 h-5" />
            </Button>
          )}
        </footer>
        
        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0", 
            isEmojiPickerOpen
              ? "h-[300px] opacity-100 visible pointer-events-auto"
              : "h-0 opacity-0 invisible pointer-events-none",
            isEmojiPickerOpen && "bg-background" // Ensure emoji picker has its own background
          )}
        >
          {isEmojiPickerOpen && (
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          )}
        </div>
      </div>
    </div>
  );
}
