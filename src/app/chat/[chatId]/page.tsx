
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
  
  const messageListContainerRef = useRef<HTMLDivElement>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
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

  // Scroll to bottom when new messages arrive or emoji picker opens/closes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isEmojiPickerOpen]);


  // visualViewport effect for keyboard and bottom bar handling
  useEffect(() => {
    const visualViewport = window.visualViewport;
    const mcEl = messageListContainerRef.current;
    const bbEl = bottomBarRef.current;

    if (!visualViewport || !mcEl || !bbEl) {
      return;
    }

    const handleResize = () => {
      // Calculate the keyboard's height or any other UI elements taking space from the bottom
      const keyboardOffset = Math.max(0, window.innerHeight - (visualViewport.height + visualViewport.offsetTop) );
      
      // Translate the bottom bar (input + emoji picker) up by the keyboard's height
      bbEl.style.transform = `translateY(-${keyboardOffset}px)`;
      
      // The message list container needs padding at its bottom
      // to clear the visible portion of the bottom bar.
      let currentBottomBarVisibleHeight = 0;
      const inputFooterEl = bbEl.querySelector('footer');
      if (inputFooterEl) {
        currentBottomBarVisibleHeight += inputFooterEl.offsetHeight;
      }
      const emojiPickerContentEl = bbEl.children[1] as HTMLElement;
      if (isEmojiPickerOpen && emojiPickerContentEl) {
        currentBottomBarVisibleHeight += emojiPickerContentEl.offsetHeight; // e.g. 300px
      }
      
      mcEl.style.paddingBottom = `${currentBottomBarVisibleHeight}px`;
      // Ensure the last message is visible after layout adjustment
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    };

    visualViewport.addEventListener('resize', handleResize);
    handleResize(); // Initial call to set layout

    return () => {
      visualViewport.removeEventListener('resize', handleResize);
      // Reset styles on cleanup
      if (mcEl) mcEl.style.paddingBottom = '0px';
      if (bbEl) bbEl.style.transform = 'translateY(0px)';
    };
  }, [isEmojiPickerOpen]); // Rerun when emoji picker state changes


  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewMessage(prevMessage => prevMessage + emoji);
    textareaRef.current?.focus();
  }, []);

  const showComingSoonToastOptions = () => {
    toast({
      title: "Hold Tight, Connecting Soon! 🚀",
      description: "Our team is busy crafting this awesome feature for you. It'll be ready before your next chai break! Stay tuned with BharatConnect! 🇮🇳✨",
    });
  };

  const toggleEmojiPicker = () => {
    setIsEmojiPickerOpen(prev => !prev);
    if (!isEmojiPickerOpen) { // if opening
        textareaRef.current?.blur(); // Remove focus from textarea to prevent keyboard
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
    setIsEmojiPickerOpen(false); 
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
    return (
      <div className="relative flex flex-col h-dvh bg-background overflow-hidden">
        <header className="fixed top-0 left-0 right-0 flex items-center p-3 border-b bg-background h-16 z-20">
          <Skeleton className="w-8 h-8 rounded-full mr-2" />
          <Skeleton className="w-10 h-10 rounded-full mr-3" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="w-2/4 h-4" />
            <Skeleton className="w-1/3 h-3" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full ml-auto" />
        </header>
        <div className="flex flex-col flex-1 pt-16 overflow-hidden">
            <div className="flex-grow overflow-y-auto p-4 space-y-4 min-h-0">
            {[...Array(5)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <Skeleton className={`w-3/5 h-12 rounded-lg ${i % 2 === 0 ? 'bg-secondary' : 'bg-primary/80'}`} />
                </div>
            ))}
            </div>
            <div className="p-3 border-t bg-background flex-shrink-0 fixed bottom-0 left-0 right-0">
              <div className="flex items-center space-x-2">
                  <Skeleton className="w-8 h-10 rounded-md" />
                  <Skeleton className="flex-1 h-10 rounded-md" />
                  <Skeleton className="w-10 h-10 rounded-full" />
              </div>
            </div>
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
    <div className="relative flex flex-col h-dvh bg-background overflow-hidden"> {/* Outermost */}
      <header className="fixed top-0 left-0 right-0 flex items-center p-2.5 border-b bg-background h-16 z-20"> {/* Header: fixed */}
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

      {/* Message List Area: Fills space between header and bottom bar, scrolls internally */}
      <div
        ref={messageListContainerRef}
        className="flex-1 overflow-y-auto hide-scrollbar" // hide-scrollbar for custom scrollbar behavior
        style={{ paddingTop: '4rem' }} // Header height (h-16 = 4rem)
      >
        <div className="flex flex-col p-4 space-y-2 pb-2"> {/* Inner padding for messages */}
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} isOutgoing={msg.senderId === 'currentUser'} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Bar: Fixed to bottom, contains Input and Emoji Picker. Moves with keyboard. */}
      <div
        ref={bottomBarRef}
        className="fixed bottom-0 left-0 right-0 bg-background border-t z-10"
        // `env(safe-area-inset-bottom)` can be added to padding/margin here if needed for iOS home indicator
      >
        <footer className="flex items-end space-x-2 p-2">
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
            "transition-all duration-300 ease-in-out overflow-hidden", // Added overflow-hidden
            isEmojiPickerOpen
              ? "h-[300px] opacity-100 visible pointer-events-auto"
              : "h-0 opacity-0 invisible pointer-events-none",
            isEmojiPickerOpen && "bg-background"
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
    

    