
"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import MessageBubble from '@/components/message-bubble';
import type { Message, User, Chat } from '@/types'; // BharatConnect types
import { AURA_OPTIONS } from '@/types';
import { mockMessagesData, mockUsers, mockChats, mockCurrentUser } from '@/lib/mock-data';
import { ArrowLeft, Paperclip, Send, SmilePlus, MoreVertical, Camera, UserCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import EmojiPicker from '@/components/emoji-picker';
import { auth } from '@/lib/firebase';
import type { User as AuthUser } from 'firebase/auth'; // Firebase Auth User
import { onAuthStateChanged } from 'firebase/auth';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;
  const { toast } = useToast();

  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(undefined);
  const [authCheckCompleted, setAuthCheckCompleted] = useState(false);
  const [onboardingComplete] = useLocalStorage('onboardingComplete', false);
  const [isGuardLoading, setIsGuardLoading] = useState(true);

  // Page specific state
  const [isChatDataLoading, setIsChatDataLoading] = useState(true); // Renamed from isLoading
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthCheckCompleted(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authCheckCompleted) {
      setIsGuardLoading(true);
      return;
    }
    if (!authUser) {
      router.replace('/login');
      return;
    }
    if (!onboardingComplete) {
      router.replace('/profile-setup');
      return;
    }
    setIsGuardLoading(false);
  }, [authCheckCompleted, authUser, onboardingComplete, router]);

  useEffect(() => {
    if (isGuardLoading) return; // Don't load chat data until guard passes

    setIsChatDataLoading(true);
    setTimeout(() => {
      const currentChat = mockChats.find(c => c.id === chatId);
      if (currentChat) {
        setChatDetails(currentChat);
        const contactUser = currentChat.contactUserId ? mockUsers.find(u => u.id === currentChat.contactUserId) : null;
        setContact(contactUser);
        const chatMessages = mockMessagesData[chatId] || [];
        setMessages(chatMessages);
      }
      setIsChatDataLoading(false);
    }, 1000);
  }, [chatId, isGuardLoading]);

  useEffect(() => {
    if (messageListContainerRef.current) {
        messageListContainerRef.current.scrollTop = messageListContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isGuardLoading) return;
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
    updateLayout(); 

    return () => {
      visualViewport.removeEventListener('resize', updateLayout);
      resizeObserver.disconnect();
      bbEl.style.bottom = '0px';
      mcEl.style.paddingBottom = `${lastBottomBarOffsetHeight}px`;
    };
  }, [isEmojiPickerOpen, textareaRef, isGuardLoading]);


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
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !authUser) return;

    const messageToSend: Message = {
      id: `msg${Date.now()}`,
      chatId: chatId,
      senderId: authUser.uid, // Use Firebase UID
      text: newMessage.trim(),
      timestamp: Date.now(),
      status: 'sent',
      type: 'text',
    };
    setMessages(prevMessages => [...prevMessages, messageToSend]);
    setNewMessage('');

    if (isEmojiPickerOpen) setIsEmojiPickerOpen(false);
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
      if (event.target) event.target.value = '';
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

  const contactAura = contact?.currentAuraId ? AURA_OPTIONS.find(a => a.id === contact.currentAuraId) : null;
  const contactStatus = contactAura ? `Feeling ${contactAura.name} ${contactAura.emoji}` : contact?.status;

  if (isGuardLoading || isChatDataLoading) {
    return (
      <div className="flex flex-col h-dvh bg-background items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-muted-foreground">Loading Chat...</p>
        {/* More detailed skeleton can be here if preferred over simple spinner */}
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
  
  const currentSenderId = authUser?.uid || 'currentUser'; // Fallback for mock data if needed

  return (
    <div className="flex flex-col h-dvh bg-background">
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center p-2.5 border-b bg-background h-16">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10 mr-3">
          {contact.avatarUrl ? (
            <AvatarImage src={contact.avatarUrl} alt={contact.name} data-ai-hint="person avatar"/>
          ) : (
             <AvatarFallback className={cn(contactAura?.gradient ? 'bg-transparent' : 'bg-muted text-muted-foreground')}>
              {contactAura ? contactAura.emoji : <UserCircle2 className="w-7 h-7 text-muted-foreground" />}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold">{contact.name}</h2>
          <p className="text-xs text-muted-foreground truncate">{contactStatus || 'Offline'}</p>
        </div>
        <Button variant="ghost" size="icon" className="ml-auto" onClick={showComingSoonToastOptions}>
          <MoreVertical className="w-5 h-5" />
        </Button>
      </header>

      <div ref={mainContentRef} className="flex flex-col flex-1 pt-16 overflow-hidden">
        <div ref={messageListContainerRef} className={cn("flex-grow overflow-y-auto hide-scrollbar pt-2 pb-2 px-2 space-y-2 min-h-0")}>
            {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} isOutgoing={msg.senderId === currentSenderId} />
            ))}
            <div ref={messagesEndRef} />
        </div>
      </div>

      <div ref={bottomBarRef} className={cn("fixed left-0 right-0 z-10 bg-background border-t", "pb-[env(safe-area-inset-bottom)]")} style={{ bottom: '0px', transform: 'translateZ(0px)' }}>
        <footer className="flex items-end space-x-2 p-2.5 flex-shrink-0">
           <Button variant="ghost" size="icon" type="button" className={cn("hover:bg-transparent", isEmojiPickerOpen && "bg-accent/20 text-primary")} onClick={toggleEmojiPicker} aria-pressed={isEmojiPickerOpen} aria-label="Toggle emoji picker">
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
              onFocus={() => { if(isEmojiPickerOpen) setIsEmojiPickerOpen(false); }}
              rows={1}
              className={cn("chat-input-sweep-border-textarea", "resize-none min-h-[40px] max-h-[100px] rounded-full px-6 py-2.5 leading-tight hide-scrollbar")}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e as any);
                  if (textareaRef.current) textareaRef.current.style.height = 'auto';
                }
              }}
            />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,text/plain,audio/*" />
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
            <Button type="submit" size="icon" onClick={handleSendMessage} className="rounded-full bg-gradient-to-r from-purple-500 to-purple-700 text-primary-foreground w-10 h-10 flex-shrink-0">
              <Send className="w-5 h-5" />
            </Button>
          )}
        </footer>
        <div className={cn("transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0", isEmojiPickerOpen ? "h-[300px] opacity-100 visible pointer-events-auto" : "h-0 opacity-0 invisible pointer-events-none", isEmojiPickerOpen && "bg-background")}>
          {isEmojiPickerOpen && (<EmojiPicker onEmojiSelect={handleEmojiSelect} />)}
        </div>
      </div>
    </div>
  );
}
