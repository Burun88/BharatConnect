
"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MessageBubble from '@/components/message-bubble';
import type { Message, User, Chat, LocalUserProfile } from '@/types';
import { AURA_OPTIONS } from '@/types';
import { mockMessagesData, mockUsers, mockChats as initialMockChats, mockCurrentUser } from '@/lib/mock-data';
import { ArrowLeft, Paperclip, Send, SmilePlus, MoreVertical, Camera, UserCircle2, Check, X, Info, MessageSquareX, Trash2, Quote, Eye, Mail, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import EmojiPicker from '@/components/emoji-picker';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { firestore } from '@/lib/firebase';
import { doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';


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
  const [isCancellingRequest, setIsCancellingRequest] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isProcessingRequestAction, setIsProcessingRequestAction] = useState(false);
  const [actionBeingProcessed, setActionBeingProcessed] = useState<'accepted' | 'rejected' | null>(null);


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
    console.log(`[ChatPage] useEffect for chatId: ${chatId}, currentUserId: ${currentUserId}`);
    setTimeout(() => {
      let currentChat = initialMockChats.find(c => c.id === chatId);
      console.log(`[ChatPage] Found in initialMockChats for ${chatId}:`, currentChat);

      if (!currentChat && (chatId.startsWith('req_sent_') || chatId.startsWith('req_rec_'))) {
          console.log(`[ChatPage] Attempting to reconstruct request chat for ID: ${chatId}`);
          const parts = chatId.split('_');
          const contactIdFromChatId = parts.length === 3 ? parts[2] : null;
          const typeFromChatId = parts.length > 1 ? parts[1] : null;
          console.log(`[ChatPage] Parsed request: contactId=${contactIdFromChatId}, type=${typeFromChatId}`);


          if (contactIdFromChatId) {
              const potentialContact = mockUsers.find(u => u.id === contactIdFromChatId);
              console.log(`[ChatPage] Potential contact for ID ${contactIdFromChatId} from mockUsers:`, potentialContact);

              if (potentialContact && userProfileLs) {
                  currentChat = {
                      id: chatId,
                      type: 'individual',
                      name: potentialContact.name,
                      contactUserId: contactIdFromChatId,
                      participants: [
                          { id: userProfileLs.uid, name: userProfileLs.displayName || 'You', avatarUrl: userProfileLs.photoURL || undefined, username: userProfileLs.username || 'you' },
                          potentialContact
                      ],
                      lastMessage: null,
                      unreadCount: typeFromChatId === 'rec' ? 1 : 0,
                      avatarUrl: potentialContact.avatarUrl,
                      requestStatus: typeFromChatId === 'sent' ? 'pending' : (typeFromChatId === 'rec' ? 'awaiting_action' : 'none'),
                      requesterId: typeFromChatId === 'sent' ? userProfileLs.uid : contactIdFromChatId,
                      firstMessageTextPreview: typeFromChatId === 'sent' ? "Request sent. Waiting for approval..." : (mockMessagesData[chatId]?.[0]?.text || "Wants to connect with you. Tap to respond.")
                  };
                  console.log(`[ChatPage] Reconstructed currentChat for request:`, currentChat);
              } else {
                console.warn(`[ChatPage] Could not find potentialContact in mockUsers for ID ${contactIdFromChatId} or userProfileLs missing.`);
              }
          } else {
             console.warn(`[ChatPage] Could not parse contactIdFromChatId from ${chatId}`);
          }
      }

      if (currentChat) {
        setChatDetails(currentChat);
        const contactUser = currentChat.participants.find(p => p.id !== currentUserId);
        setContact(contactUser || null);
        console.log(`[ChatPage] Set chatDetails:`, currentChat, `Set contactUser:`, contactUser);

        if (currentChat.requestStatus === 'accepted' || !currentChat.requestStatus || currentChat.requestStatus === 'none') {
            setMessages(mockMessagesData[chatId] || []);
        } else if (currentChat.requestStatus === 'awaiting_action' && currentChat.requesterId !== currentUserId) {
            const previewMsgText = currentChat.firstMessageTextPreview || (mockMessagesData[chatId]?.[0]?.text) || "Wants to connect with you.";
             if (contactUser) {
                setMessages([{
                    id: `preview_${chatId}`,
                    chatId: chatId,
                    senderId: contactUser.id,
                    text: previewMsgText,
                    timestamp: Date.now(),
                    type: 'text'
                }]);
             } else {
                 setMessages([]);
             }
        } else if (currentChat.requestStatus === 'pending' && currentChat.requesterId === currentUserId) {
            const previewMsgText = currentChat.firstMessageTextPreview || (mockMessagesData[chatId]?.[0]?.text) || "Request sent. Waiting for approval...";
            setMessages([{
                id: `preview_pending_${chatId}`,
                chatId: chatId,
                senderId: currentUserId,
                text: previewMsgText,
                timestamp: Date.now(),
                type: 'text',
                status: 'sent'
            }]);
        }
        else {
            setMessages([]);
        }
      } else {
        console.warn(`[ChatPage] currentChat is still null for chatId: ${chatId}. Setting chatDetails and contact to null.`);
        setChatDetails(null);
        setContact(null);
      }
      setIsChatDataLoading(false);
    }, 300);
  }, [chatId, isGuardLoading, currentUserId, userProfileLs]);

  useEffect(() => {
    if (messageListContainerRef.current && (chatDetails?.requestStatus === 'accepted' || !chatDetails?.requestStatus || chatDetails?.requestStatus === 'none')) {
        messageListContainerRef.current.scrollTop = messageListContainerRef.current.scrollHeight;
    }
  }, [messages, chatDetails?.requestStatus]);

  useEffect(() => {
    if (isGuardLoading) return;
    const mcEl = mainContentRef.current;
    const bbEl = bottomBarRef.current;
    const vp = window.visualViewport;

    if (!mcEl || !bbEl || !vp) return;

    let lastKeyboardHeight = 0;
    let lastBottomBarActualHeight = bbEl.offsetHeight;

    const updateLayout = () => {
      const currentInputBarActualHeight = bbEl.offsetHeight;
      let physicalKeyboardHeight = 0;
      const isKeyboardEffectivelyOpen = vp.height < window.innerHeight - 50;

      if (isKeyboardEffectivelyOpen && !isEmojiPickerOpen) {
        physicalKeyboardHeight = window.innerHeight - vp.offsetTop - vp.height;
      }

      bbEl.style.bottom = `${physicalKeyboardHeight}px`;
      mcEl.style.paddingBottom = `${currentInputBarActualHeight}px`;

      if (physicalKeyboardHeight > 0 && physicalKeyboardHeight !== lastKeyboardHeight && document.activeElement === textareaRef.current) {
        if (messageListContainerRef.current) {
           messageListContainerRef.current.scrollTop = messageListContainerRef.current.scrollHeight;
        }
      }
      lastKeyboardHeight = physicalKeyboardHeight;
      lastBottomBarActualHeight = currentInputBarActualHeight;
    };

    vp.addEventListener('resize', updateLayout);
    const resizeObserver = new ResizeObserver(() => {
        if(bbEl.offsetHeight !== lastBottomBarActualHeight) {
            updateLayout();
        }
    });
    resizeObserver.observe(bbEl);

    updateLayout();

    return () => {
      vp.removeEventListener('resize', updateLayout);
      resizeObserver.disconnect();
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
    if (newMessage.trim() === '' || !userProfileLs?.uid || (chatDetails?.requestStatus !== 'accepted' && chatDetails?.requestStatus !== 'none' && chatDetails?.requestStatus !== undefined) ) return;

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

  const handleRequestAction = async (action: 'accepted' | 'rejected') => {
    if (!chatDetails || !contact || !currentUserId) {
      toast({ variant: "destructive", title: "Error", description: "Missing details for request action." });
      return;
    }

    setIsProcessingRequestAction(true);
    setActionBeingProcessed(action);

    try {
      const receivedRequestRef = doc(firestore, `bharatConnectUsers/${currentUserId}/requestsReceived`, contact.id);
      const sentRequestRef = doc(firestore, `bharatConnectUsers/${contact.id}/requestsSent`, currentUserId);

      const updateData = {
        status: action,
        timestamp: serverTimestamp()
      };

      await updateDoc(receivedRequestRef, updateData);
      await updateDoc(sentRequestRef, updateData);
      
      // Update local state and mock data after successful Firestore update
      setChatDetails(prev => prev ? { ...prev, requestStatus: action } : null);

      const chatIndex = initialMockChats.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        initialMockChats[chatIndex].requestStatus = action;
        if (action === 'accepted') {
          initialMockChats[chatIndex].lastMessage = {
              id: `sys_accepted_${Date.now()}`,
              chatId: chatId,
              senderId: 'system',
              text: `Chat request accepted. You can now message ${contact.name}.`,
              timestamp: Date.now(),
              type: 'system'
          };
        }
      } else if (action === 'accepted') {
        const newAcceptedChat: Chat = {
          ...chatDetails, // Spread existing chatDetails
          requestStatus: 'accepted',
          lastMessage: {
              id: `sys_accepted_${Date.now()}`,
              chatId: chatId,
              senderId: 'system',
              text: `Chat request accepted. You can now message ${contact.name}.`,
              timestamp: Date.now(),
              type: 'system'
          }
        };
        initialMockChats.push(newAcceptedChat);
      }

      toast({
        title: `Request ${action === 'rejected' ? 'Ignored' : 'Accepted'}!`,
        description: `You have ${action === 'rejected' ? 'ignored' : 'accepted'} the chat request from ${contact.name}. Status updated on server.`,
      });

      if (action === 'accepted') {
        setMessages(mockMessagesData[chatId] || []); // Load actual messages if accepted
      } else {
        setMessages([]); // Clear messages if rejected
        // Optionally navigate away, or the UI will show the rejected state
        router.push('/');
      }

    } catch (error: any) {
      console.error(`Error ${action === 'accepted' ? 'accepting' : 'rejecting'} request in Firestore:`, error);
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: `Could not ${action} the request on the server. Please try again. Error: ${error.message}`
      });
    } finally {
      setIsProcessingRequestAction(false);
      setActionBeingProcessed(null);
    }
  };

  const handleCancelRequest = async () => {
    if (!chatDetails || !contact || !currentUserId) {
      toast({ variant: "destructive", title: "Error", description: "Cannot cancel request: missing details." });
      return;
    }

    setIsCancellingRequest(true);
    try {
      const sentRequestRef = doc(firestore, `bharatConnectUsers/${currentUserId}/requestsSent`, contact.id);
      const receivedRequestRef = doc(firestore, `bharatConnectUsers/${contact.id}/requestsReceived`, currentUserId);

      await deleteDoc(sentRequestRef);
      await deleteDoc(receivedRequestRef);

      const chatIndex = initialMockChats.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        initialMockChats.splice(chatIndex, 1); 
      }
      
      setChatDetails(prev => prev ? { ...prev, requestStatus: 'rejected' } : null); 
      setMessages([]);


      toast({ title: "Request Canceled", description: `Your request to ${contact.name} has been canceled.` });
      router.push('/');
    } catch (error: any) {
      console.error("Error canceling request:", error);
      toast({ variant: "destructive", title: "Cancellation Failed", description: error.message || "Could not cancel request." });
    } finally {
      setIsCancellingRequest(false);
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
      <div className="flex flex-col h-dvh bg-background items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg rounded-xl">
          <CardHeader className="items-center text-center pt-8 pb-4">
            <MessageSquareX className="w-16 h-16 text-destructive mb-4" />
            <CardTitle className="text-2xl font-semibold">Chat Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0 pb-6">
            <p className="text-muted-foreground">
              The chat you are looking for doesn't exist or may have been removed.
            </p>
          </CardContent>
          <CardFooter className="flex-col items-center space-y-3 p-6 pt-0 border-t border-border">
            <Button onClick={() => router.push('/')} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground py-3 text-base">
              Go to Chats
            </Button>
            <Button variant="outline" onClick={() => router.back()} className="w-full py-3 text-base">
              Go Back
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const isRequestView = chatDetails.requestStatus === 'awaiting_action' && chatDetails.requesterId !== currentUserId;
  const isPendingSenderView = chatDetails.requestStatus === 'pending' && chatDetails.requesterId === currentUserId;
  const isRejectedView = chatDetails.requestStatus === 'rejected';
  const isChatActive = chatDetails.requestStatus === 'accepted' || !chatDetails.requestStatus || chatDetails.requestStatus === 'none';
  const showInputArea = isChatActive;


  if (isRequestView) {
    return (
      <div className="flex flex-col h-dvh bg-background items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden bg-card hover:shadow-primary/20 transition-shadow duration-300">
          <CardHeader className="text-center pt-6 pb-2">
            <h2 className="text-3xl font-semibold text-gradient-primary-accent mb-1 sr-only">
              Connection Request
            </h2>
            <p className="text-sm text-muted-foreground">
              {contact.name} wants to connect with you.
            </p>
          </CardHeader>

          <CardContent className="p-6 pt-4 space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16 border-2 border-border shadow-md">
                {contact.avatarUrl ? (
                  <AvatarImage src={contact.avatarUrl} alt={contact.name} data-ai-hint="person avatar" />
                ) : (
                  <AvatarFallback className="bg-muted"><UserCircle2 className="w-10 h-10 text-muted-foreground" /></AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground truncate">{contact.name}</h3>
                {contact.username && <p className="text-xs text-muted-foreground truncate">@{contact.username}</p>}
                 <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="link" size="sm" className="px-0 h-auto text-primary hover:text-primary/80 -ml-0.5 mt-0.5">
                      <Eye className="w-3.5 h-3.5 mr-1" /> View Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="text-center text-xl">{contact.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-20 h-20">
                          {contact.avatarUrl ? (
                            <AvatarImage src={contact.avatarUrl} alt={contact.name} data-ai-hint="person avatar" />
                          ) : (
                            <AvatarFallback className="bg-muted"><UserCircle2 className="w-12 h-12 text-muted-foreground" /></AvatarFallback>
                          )}
                        </Avatar>
                        <div className="pt-1">
                           <h3 className="text-lg font-semibold text-foreground">{contact.name}</h3>
                           {contact.username && <p className="text-sm text-muted-foreground">@{contact.username}</p>}
                        </div>
                      </div>
                      {contact.bio && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">BIO</h4>
                          <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md shadow-inner">{contact.bio}</p>
                        </div>
                      )}
                       {contact.email && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">EMAIL</h4>
                          <div className="flex items-center space-x-2 p-2.5 rounded-md border bg-muted/30 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span className="text-sm text-foreground">{contact.email}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Close</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {(chatDetails.firstMessageTextPreview || (messages.length > 0 && messages[0].text)) && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Their message:</p>
                <div className="relative text-sm italic p-4 bg-muted/50 rounded-lg shadow-inner border border-border/50 break-words">
                  <Quote className="absolute top-2 left-2 w-4 h-4 text-muted-foreground/50 transform -scale-x-100" />
                  <p className="ml-2">
                    {chatDetails.firstMessageTextPreview || (messages.length > 0 && messages[0].text) || 'Tap to respond.'}
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center pt-2">Accept this chat request to start messaging.</p>
          </CardContent>

          <CardFooter className="grid grid-cols-2 gap-3 p-4 bg-card border-t border-border">
            <Button
              variant="outline"
              onClick={() => handleRequestAction('rejected')}
              className="w-full py-3 text-base border-muted-foreground/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              disabled={isProcessingRequestAction}
            >
              {isProcessingRequestAction && actionBeingProcessed === 'rejected' ? (
                <>
                 <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Ignoring...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" /> Ignore
                </>
              )}
            </Button>
            <Button
              onClick={() => handleRequestAction('accepted')}
              className="w-full py-3 text-base bg-gradient-to-r from-green-500 to-green-700 text-primary-foreground hover:opacity-90"
              disabled={isProcessingRequestAction}
            >
               {isProcessingRequestAction && actionBeingProcessed === 'accepted' ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Accept
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isPendingSenderView) {
    return (
      <div className="flex flex-col h-dvh bg-background items-center justify-center p-4">
        <Card className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden bg-card">
            <CardHeader className="items-center text-center pt-8 pb-4">
                <Send className="w-12 h-12 text-amber-500 mb-3" />
                <CardTitle className="text-2xl font-semibold text-amber-600">
                    Request Sent
                </CardTitle>
            </CardHeader>
            <CardContent className="text-center p-6 pt-0">
                <p className="text-sm text-muted-foreground">Your message request has been sent to {contact.name}. You'll be able to chat once they accept.</p>
                {(chatDetails.firstMessageTextPreview || (messages.length > 0 && messages[0].text)) && (
                  <p className="text-sm text-muted-foreground italic mt-4 p-3 bg-muted/50 rounded-lg shadow-inner break-words">
                    &ldquo;{chatDetails.firstMessageTextPreview || (messages.length > 0 && messages[0].text)}&rdquo;
                  </p>
                )}
            </CardContent>
            <CardFooter className="flex-col space-y-3 p-6 border-t border-border">
                <Button 
                  variant="destructive" 
                  onClick={handleCancelRequest} 
                  className="w-full py-3 text-base"
                  disabled={isCancellingRequest}
                >
                  {isCancellingRequest ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" /> Cancel Request
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => router.push('/')} className="w-full py-3 text-base" disabled={isCancellingRequest}>
                  Back to Chats
                </Button>
            </CardFooter>
        </Card>
      </div>
    );
  }

  if (isRejectedView) {
    return (
      <div className="flex flex-col h-dvh bg-background items-center justify-center p-4">
        <Card className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden bg-card">
            <CardHeader className="items-center text-center pt-8 pb-4">
                <MessageSquareX className="w-12 h-12 text-destructive mb-3" />
                <CardTitle className="text-2xl font-semibold text-destructive">
                    {chatDetails.requesterId === currentUserId ? "Request Not Accepted" : "Request Ignored"} 
                </CardTitle>
            </CardHeader>
            <CardContent className="text-center p-6 pt-0">
                {chatDetails.requesterId === currentUserId ?
                    <p className="text-sm text-muted-foreground">{contact.name} has not accepted your chat request.</p> :
                    <p className="text-sm text-muted-foreground">You ignored the chat request from {contact.name}.</p>
                }
            </CardContent>
            <CardFooter className="p-6 border-t border-border">
                <Button variant="outline" onClick={() => router.push('/')} className="w-full py-3 text-base">
                Back to Chats
                </Button>
            </CardFooter>
        </Card>
      </div>
    );
  }

  // If it's an active chat (none of the above request states)
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
        </div>
        <Button variant="ghost" size="icon" className="ml-auto" onClick={showComingSoonToastOptions}>
          <MoreVertical className="w-5 h-5" />
        </Button>
      </header>

      <div ref={mainContentRef} className="flex flex-col flex-1 pt-16 overflow-hidden">
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
        <div
          ref={bottomBarRef}
          className={cn("fixed left-0 right-0 z-10 bg-background border-t", "pb-[env(safe-area-inset-bottom)]")}
          style={{ bottom: '0px', transform: 'translateZ(0px)' }}
        >
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
                "resize-none min-h-[40px] max-h-[100px] rounded-full px-6 py-2.5 leading-tight hide-scrollbar focus-visible:focus-visible-gradient-border-apply"
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
