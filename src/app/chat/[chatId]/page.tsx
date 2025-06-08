
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
  
  const mainContentRef = useRef<HTMLDivElement>(null); 
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

  useEffect(() => {
    if (messageListContainerRef.current) {
        messageListContainerRef.current.scrollTop = messageListContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  useEffect(() => {
    const mcEl = mainContentRef.current; 
    const bbEl = bottomBarRef.current; 
    const visualViewport = window.visualViewport;

    if (!mcEl || !bbEl || !visualViewport) return;

    let lastKeyboardHeight = 0;
    let lastBottomBarOffsetHeight = bbEl.offsetHeight;

    const updateLayout = () => {
      const currentBottomBarOffsetHeight = bbEl.offsetHeight;
      let keyboardHeight = 0;
      
      const isKeyboardEffectivelyOpen = window.innerHeight > visualViewport.height + 50; 

      if (isKeyboardEffectivelyOpen && !isEmojiPickerOpen) {
        keyboardHeight = window.innerHeight - visualViewport.offsetTop - visualViewport.height;
      }
      
      bbEl.style.bottom = `${isEmojiPickerOpen ? 0 : keyboardHeight}px`;
      mcEl.style.paddingBottom = `${currentBottomBarOffsetHeight + (isEmojiPickerOpen ? 0 : keyboardHeight)}px`;
      
      if (keyboardHeight > 0 && keyboardHeight !== lastKeyboardHeight && document.activeElement === textareaRef.current) {
        if (messageListContainerRef.current) {
           messageListContainerRef.current.scrollTop = messageListContainerRef.current.scrollHeight;
        }
      }
      
      lastKeyboardHeight = keyboardHeight;
      lastBottomBarOffsetHeight = currentBottomBarOffsetHeight;
    };
    
    visualViewport.addEventListener('resize', updateLayout);
    const resizeObserver = new ResizeObserver(() => {
        if(bbEl.offsetHeight !== lastBottomBarOffsetHeight) {
            updateLayout();
        }
    });
    resizeObserver.observe(bbEl);
    
    updateLayout(); // Initial call to set layout

    return () => {
      visualViewport.removeEventListener('resize', updateLayout);
      resizeObserver.disconnect();
      // Reset styles on cleanup
      bbEl.style.bottom = '0px';
      mcEl.style.paddingBottom = `${lastBottomBarOffsetHeight}px`;
    };
  }, [isEmojiPickerOpen, textareaRef]); // Added textareaRef dependency


  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewMessage(prevMessage => prevMessage + emoji);
    // Do not focus textarea here to keep emoji picker open
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
      // Delay focus slightly to allow keyboard to fully retract if it was open
      setTimeout(() => textareaRef.current?.focus(), 50);
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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
      textareaRef.current.focus();
    }

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
      <div className="flex flex-col h-dvh bg-background">
        <header className="fixed top-0 left-0 right-0 z-20 flex items-center p-3 border-b bg-background h-16">
          <Skeleton className="w-8 h-8 rounded-full mr-2" />
          <Skeleton className="w-10 h-10 rounded-full mr-3" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="w-2/4 h-4" />
            <Skeleton className="w-1/3 h-3" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full ml-auto" />
        </header>
        <div 
            ref={mainContentRef} // Keep ref for potential future direct manipulation if needed for padding
            className="flex flex-col flex-1 pt-16" // Padding top for header
        >
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <Skeleton className={`w-3/5 h-12 rounded-lg ${i % 2 === 0 ? 'bg-secondary' : 'bg-primary/80'}`} />
                    </div>
                ))}
            </div>
        </div>
         <div 
            ref={bottomBarRef} // Keep ref for height observation
            className="fixed left-0 right-0 z-10 bg-background border-t"
            style={{ bottom: '0px' }} // Initial bottom position
        >
            <Skeleton className="w-full h-10 rounded-full p-2.5" />
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
    <div className="flex flex-col h-dvh bg-background">
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center p-2.5 border-b bg-background h-16">
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

      <div 
        ref={mainContentRef}
        className="flex flex-col flex-1 pt-16 overflow-hidden" 
      >
        <div 
            ref={messageListContainerRef}
            className={cn(
                "flex-grow overflow-y-auto hide-scrollbar pt-2 pb-2 px-2 space-y-2 min-h-0" 
            )}
        >
            {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} isOutgoing={msg.senderId === 'currentUser'} />
            ))}
            <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div 
        ref={bottomBarRef}
        className={cn(
            "fixed left-0 right-0 z-10 bg-background border-t",
            "pb-[env(safe-area-inset-bottom)]"
        )}
        style={{ bottom: '0px', transform: 'translateZ(0px)' }} 
      >
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
          <div className="chat-input-sweep-border-wrapper flex-1">
            <Textarea
              ref={textareaRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onFocus={() => {
                if(isEmojiPickerOpen) setIsEmojiPickerOpen(false);
              }}
              rows={1}
              className={cn(
                  "chat-input-sweep-border-textarea", // New class for core styles
                  "resize-none min-h-[40px] max-h-[100px] rounded-full px-6 py-2.5 leading-tight hide-scrollbar" // Existing utility classes for sizing/padding, px-4 changed to px-6
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e as any);
                  if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto'; 
                  }
                }
              }}
            />
          </div>
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

