
"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MessageBubble from '@/components/message-bubble';
import type { Message, User, Chat, LocalUserProfile, ChatRequestStatus } from '@/types'; 
import { AURA_OPTIONS, mockCurrentUser } from '@/types'; 
import { mockMessagesData, mockUsers, mockChats as initialMockChats } from '@/lib/mock-data';
import { ArrowLeft, Paperclip, Send, SmilePlus, MoreVertical, Camera, UserCircle2, Check, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import EmojiPicker from '@/components/emoji-picker';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';


export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;
  const { toast } = useToast();

  const [userProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  const [isGuardLoading, setIsGuardLoading] = useState(true);

  const [isChatDataLoading, setIsChatDataLoading] = useState(true);
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

  const currentUserId = userProfileLs?.uid || mockCurrentUser.id;

  useEffect(() => {
    if (!userProfileLs || !userProfileLs.uid || !userProfileLs.onboardingComplete) {
      router.replace('/login');
      return;
    }
    setIsGuardLoading(false);
  }, [userProfileLs, router]);

  useEffect(() => {
    if (isGuardLoading) return; 

    setIsChatDataLoading(true);
    setTimeout(() => {
      const currentChat = initialMockChats.find(c => c.id === chatId);
      if (currentChat) {
        setChatDetails(currentChat);
        const contactUser = currentChat.contactUserId ? mockUsers.find(u => u.id === currentChat.contactUserId) : null;
        setContact(contactUser);
        // Only load full messages if chat is accepted or has no request status (legacy)
        if (currentChat.requestStatus === 'accepted' || !currentChat.requestStatus || currentChat.requestStatus === 'none') {
            setMessages(mockMessagesData[chatId] || []);
        } else if (currentChat.requestStatus === 'awaiting_action' && currentChat.requesterId !== currentUserId) {
            // For awaiting action, show only the first message preview (handled by UI, not full messages list)
            setMessages([]); // Or just the preview message if desired in bubble format
        } else {
            setMessages([]); // No messages for pending (sender) or rejected
        }
      }
      setIsChatDataLoading(false);
    }, 500); // Reduced timeout
  }, [chatId, isGuardLoading, currentUserId]);

  useEffect(() => {
    if (messageListContainerRef.current && (chatDetails?.requestStatus === 'accepted' || !chatDetails?.requestStatus || chatDetails?.requestStatus === 'none')) {
        messageListContainerRef.current.scrollTop = messageListContainerRef.current.scrollHeight;
    }
  }, [messages, chatDetails?.requestStatus]);

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
      // Corrected padding: Main content area only needs padding for the input bar's height.
      // The keyboard's space is accounted for by the browser's viewport adjustments (h-dvh and flex).
      mcEl.style.paddingBottom = `${currentBottomBarOffsetHeight}px`;

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
      // Reset styles on cleanup, though typically page navigation will handle this
      bbEl.style.bottom = '0px';
      mcEl.style.paddingBottom = `${lastBottomBarOffsetHeight}px`; // Use the last known height of the bar
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
    if (newMessage.trim() === '' || !userProfileLs?.uid || chatDetails?.requestStatus !== 'accepted') return;

    const messageToSend: Message = {
      id: `msg${Date.now()}`,
      chatId: chatId,
      senderId: userProfileLs.uid,
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

  const handleRequestAction = (action: 'accepted' | 'rejected') => {
    if (!chatDetails || !contact) return;
    // Simulate updating the chat request status
    setChatDetails(prev => prev ? { ...prev, requestStatus: action } : null);
    
    // In a real app, update mockChats/Firestore and notify sender
    const chatIndex = initialMockChats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      initialMockChats[chatIndex].requestStatus = action;
    }

    toast({
      title: `Request ${action}`,
      description: `You have ${action} the chat request from ${contact.name}.`,
    });

    if (action === 'accepted') {
      // Load messages for accepted chat
      setMessages(mockMessagesData[chatId] || []);
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
  
  const isRequestView = chatDetails.requestStatus === 'awaiting_action' && chatDetails.requesterId !== currentUserId;
  const isPendingSenderView = chatDetails.requestStatus === 'pending' && chatDetails.requesterId === currentUserId;
  const isRejectedView = chatDetails.requestStatus === 'rejected';
  const isChatActive = chatDetails.requestStatus === 'accepted' || !chatDetails.requestStatus || chatDetails.requestStatus === 'none';
  const showInputArea = isChatActive;

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
             <AvatarFallback className={cn(contactAura?.gradient && isChatActive ? 'bg-transparent' : 'bg-muted text-muted-foreground')}>
              {contactAura && isChatActive ? contactAura.emoji : <UserCircle2 className="w-7 h-7 text-muted-foreground" />}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold">{contact.name}</h2>
          {isChatActive && <p className="text-xs text-muted-foreground truncate">{contactStatus || 'Offline'}</p>}
          {isRequestView && <p className="text-xs text-primary truncate">Wants to connect with you</p>}
          {isPendingSenderView && <p className="text-xs text-amber-500 truncate">Request sent, awaiting approval</p>}
           {isRejectedView && <p className="text-xs text-destructive truncate">Chat request rejected</p>}
        </div>
        <Button variant="ghost" size="icon" className="ml-auto" onClick={showComingSoonToastOptions}>
          <MoreVertical className="w-5 h-5" />
        </Button>
      </header>

      <div ref={mainContentRef} className="flex flex-col flex-1 pt-16 overflow-hidden">
        {isRequestView && (
          <Card className="m-4 shadow-lg border-primary/50">
            <CardHeader className="items-center text-center">
              <Avatar className="w-16 h-16 mb-2">
                {contact.avatarUrl ? <AvatarImage src={contact.avatarUrl} alt={contact.name} data-ai-hint="person avatar"/> : <AvatarFallback><UserCircle2 className="w-10 h-10" /></AvatarFallback>}
              </Avatar>
              <CardTitle>{contact.name} wants to connect!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <p className="text-sm text-muted-foreground italic p-3 bg-muted/50 rounded-md">
                "{chatDetails.firstMessageTextPreview || 'No message preview.'}"
              </p>
              <p className="text-xs text-muted-foreground pt-2">Accept this chat request to start messaging.</p>
            </CardContent>
            <CardFooter className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => handleRequestAction('rejected')} className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button onClick={() => handleRequestAction('accepted')} className="bg-gradient-to-r from-green-500 to-green-700 text-primary-foreground">
                <Check className="mr-2 h-4 w-4" /> Accept
              </Button>
            </CardFooter>
          </Card>
        )}

        {(isPendingSenderView || isRejectedView) && (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="items-center">
                    {isPendingSenderView && <Send className="w-12 h-12 text-amber-500 mb-3" />}
                    {isRejectedView && <XCircle className="w-12 h-12 text-destructive mb-3" />}
                    <CardTitle className={cn(isPendingSenderView && "text-amber-600", isRejectedView && "text-destructive")}>
                        {isPendingSenderView && "Request Sent"}
                        {isRejectedView && "Request Rejected"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isPendingSenderView && <p className="text-sm text-muted-foreground">Your message request has been sent to ${contact.name}. You'll be able to chat once they accept.</p>}
                    {isRejectedView && (
                        chatDetails.requesterId === currentUserId ?
                        <p className="text-sm text-muted-foreground">Your chat request to ${contact.name} was rejected.</p> :
                        <p className="text-sm text-muted-foreground">You rejected the chat request from ${contact.name}.</p>
                    )}
                </CardContent>
            </Card>
          </div>
        )}

        {isChatActive && (
          <div ref={messageListContainerRef} className={cn("flex-grow overflow-y-auto hide-scrollbar pt-2 pb-2 px-2 space-y-2 min-h-0")}>
              {messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} isOutgoing={msg.senderId === currentUserId} />
              ))}
              <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {showInputArea && (
        <div ref={bottomBarRef} className={cn("fixed left-0 right-0 z-10 bg-background border-t", "pb-[env(safe-area-inset-bottom)]")} style={{ bottom: '0px', transform: 'translateZ(0px)' }}>
          <footer className="flex items-end space-x-2 p-2.5 flex-shrink-0">
            <Button variant="ghost" size="icon" type="button" className={cn("hover:bg-transparent", isEmojiPickerOpen && "bg-accent/20 text-primary")} onClick={toggleEmojiPicker} aria-pressed={isEmojiPickerOpen} aria-label="Toggle emoji picker">
              <SmilePlus className={cn("w-5 h-5 text-muted-foreground", isEmojiPickerOpen && "text-primary")} />
            </Button>
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
              className={cn(
                "flex-1", 
                "resize-none min-h-[40px] max-h-[100px] rounded-full px-6 py-2.5 leading-tight hide-scrollbar"
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e as any);
                  if (textareaRef.current) textareaRef.current.style.height = 'auto';
                }
              }}
            />
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
      )}
    </div>
  );
}

