
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Message, User, Chat, ParticipantInfo, UserAura, FirestoreAura, ChatSpecificPresence } from '@/types';
import { AURA_OPTIONS } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useChat as useChatContextHook } from '@/contexts/ChatContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquareX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

import { firestore } from '@/lib/firebase';
import { doc, deleteDoc, updateDoc, serverTimestamp, collection, query, orderBy, onSnapshot, writeBatch, arrayUnion, setDoc, getDoc, Timestamp, addDoc } from 'firebase/firestore';
import { getUserFullProfile } from '@/services/profileService';
import { formatDistanceToNowStrict } from 'date-fns';

import ChatPageHeader from '@/components/chat/ChatPageHeader';
import MessageArea from '@/components/chat/MessageArea';
import ChatInputZone from '@/components/chat/ChatInputZone';
import ChatRequestDisplay from '@/components/chat/ChatRequestDisplay';
import EmojiPicker from '@/components/emoji-picker';
import EncryptedChatBanner from '@/components/chat/EncryptedChatBanner';

import { useKeyboardVisibility } from '@/hooks/useKeyboardVisibility';
import { useElementHeight } from '@/hooks/useElementHeight';
import { encryptMessage, decryptMessage } from '@/services/encryptionService';

const EMOJI_PICKER_HEIGHT_PX = 300;
const AURA_EXPIRATION_MS = 60 * 60 * 1000; 

export function generateChatId(uid1: string, uid2: string): string {
  if (!uid1 || !uid2) return `error_generating_chat_id_with_undefined_uids_${uid1}_${uid2}`;
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const initialRouteChatId = params.chatId as string;
  const { toast } = useToast();

  const { authUser, isAuthenticated, isAuthLoading } = useAuth();
  const chatContext = useChatContextHook();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [effectiveChatId, setEffectiveChatId] = useState<string | null>(null);
  const [chatDetails, setChatDetails] = useState<Chat | null>(null);
  const [contact, setContact] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  
  const [isProcessingRequestAction, setIsProcessingRequestAction] = useState(false);
  const [contactActiveAura, setContactActiveAura] = useState<UserAura | null>(null);
  const [isContactTyping, setIsContactTyping] = useState(false);
  const [contactPresence, setContactPresence] = useState<ChatSpecificPresence | null>(null);
  const [privateKeyExists, setPrivateKeyExists] = useState<boolean | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null); 
  const emojiPickerRef = useRef<HTMLDivElement>(null); 

  const { isKeyboardVisible } = useKeyboardVisibility(); 
  const inputZoneHeight = useElementHeight(bottomBarRef);
  const emojiPickerActualHeight = useElementHeight(emojiPickerRef);
  
  const initialLoadCompletedForChatIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const isMountedRef = useRef(false);
  const wasTextareaFocusedBeforeSendRef = useRef(false);
  const justSelectedEmojiRef = useRef(false);

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  useEffect(() => {
    if (authUser?.id) {
      const key = localStorage.getItem(`privateKey_${authUser.id}`);
      setPrivateKeyExists(!!key);
    }
  }, [authUser?.id]);

  const currentUserId = authUser?.id;
  const isPotentiallyNewChat = initialRouteChatId ? !initialRouteChatId.startsWith('req_') : false;

  const isChatActive = useMemo(() => {
    if (isPotentiallyNewChat && !chatDetails) return true; 
    return chatDetails?.requestStatus === 'accepted' || (!chatDetails?.requestStatus || chatDetails?.requestStatus === 'none');
  }, [chatDetails, isPotentiallyNewChat]);

  const showInputArea = useMemo(() => {
    if (!chatDetails) return isPotentiallyNewChat; 
    return chatDetails.requestStatus === 'accepted' || (!chatDetails.requestStatus || chatDetails.requestStatus === 'none');
  }, [chatDetails, isPotentiallyNewChat]);

  const showRequestSpecificUI = useMemo(() => {
      return chatDetails?.requestStatus && 
             (chatDetails.requestStatus === 'awaiting_action' || 
              chatDetails.requestStatus === 'pending' ||
              chatDetails.requestStatus === 'rejected');
  }, [chatDetails]);
  
  const dynamicPaddingBottom = useMemo(() => {
    let padding = 0;
    if (showInputArea) {
      padding += inputZoneHeight;
      if (isEmojiPickerOpen) {
        padding += emojiPickerActualHeight;
      }
    }
    return padding;
  }, [inputZoneHeight, isEmojiPickerOpen, emojiPickerActualHeight, showInputArea]);

   useEffect(() => {
    if (isKeyboardVisible && isMountedRef.current) {
      if (isEmojiPickerOpen) setIsEmojiPickerOpen(false); 
    }
  }, [isKeyboardVisible, isEmojiPickerOpen]);

  useEffect(() => {
    if (initialRouteChatId) {
      const initializeChat = async () => {
        if (isAuthLoading || !authUser || !currentUserId) {
          setIsPageLoading(true);
          return;
        }

        if (initialLoadCompletedForChatIdRef.current !== initialRouteChatId) {
            setIsPageLoading(true);
        }
        
        let determinedChatId = initialRouteChatId;
        let contactUserForChat: User | null = null;
        const chatDataFromContext: Chat | null = chatContext.getChatById(initialRouteChatId);

        if (initialRouteChatId.startsWith('req_')) {
          const contactIdFromRequestRoute = chatDataFromContext?.contactUserId || initialRouteChatId.split('_').slice(2).join('_');
          if (contactIdFromRequestRoute) {
            const profile = await getUserFullProfile(contactIdFromRequestRoute); 
            contactUserForChat = profile || { id: contactIdFromRequestRoute, name: 'User', onboardingComplete: false };
            determinedChatId = generateChatId(currentUserId, contactIdFromRequestRoute);
            if (chatDataFromContext) {
              setChatDetails(chatDataFromContext);
            }
          }
        } else { 
            const contactIdFromStandardChatId = initialRouteChatId.split('_').find(id => id !== currentUserId);
             if (contactIdFromStandardChatId) {
                const profile = await getUserFullProfile(contactIdFromStandardChatId); 
                contactUserForChat = profile || { id: contactIdFromStandardChatId, name: 'Chat User', onboardingComplete: false };
             }
            determinedChatId = initialRouteChatId;
        }
        setContact(contactUserForChat);
        setEffectiveChatId(determinedChatId);

        if (contactUserForChat && determinedChatId && !initialRouteChatId.startsWith('req_') && currentUserId && authUser.name) {
          const chatDocRef = doc(firestore, `chats/${determinedChatId}`);
          try {
            const chatDocSnap = await getDoc(chatDocRef);
            if (!chatDocSnap.exists()) {
                const participantInfoMap: { [uid: string]: ParticipantInfo } = {
                    [currentUserId]: { name: authUser.name, avatarUrl: authUser.avatarUrl || null },
                    [contactUserForChat.id]: { name: contactUserForChat.name, avatarUrl: contactUserForChat.avatarUrl || null }
                };
                const newChatPayload = {
                    id: determinedChatId, type: 'individual' as 'individual' | 'group', participants: [currentUserId, contactUserForChat.id].sort(),
                    participantInfo: participantInfoMap, lastMessage: null, updatedAt: serverTimestamp(), requestStatus: 'accepted' as Chat['requestStatus'],
                    acceptedTimestamp: serverTimestamp(), typingStatus: {}, chatSpecificPresence: {}
                };
                await setDoc(chatDocRef, newChatPayload);
            }
          } catch (e) { console.error(`[ChatPage INIT] Error creating/checking chat doc ${determinedChatId} in init:`, e); }
        }
        setIsPageLoading(false);
        initialLoadCompletedForChatIdRef.current = initialRouteChatId; 
      };
      if (currentUserId) initializeChat();
    } else { 
      setIsPageLoading(false); 
      initialLoadCompletedForChatIdRef.current = null; 
    }
  }, [initialRouteChatId, authUser, isAuthLoading, currentUserId, chatContext]);

  // Firestore-based Chat-Specific Presence
  useEffect(() => {
    if (!effectiveChatId || !currentUserId) return;

    const chatDocRef = doc(firestore, 'chats', effectiveChatId);

    const setMyPresence = (state: 'online' | 'offline') => {
      updateDoc(chatDocRef, {
        [`chatSpecificPresence.${currentUserId}.state`]: state,
        [`chatSpecificPresence.${currentUserId}.lastChanged`]: serverTimestamp(),
      }).catch(error => {
        if (error.code !== 'not-found') {
           console.error("[Presence] Error updating presence, may be expected for new chat:", error);
        }
      });
    };
    
    setMyPresence('online');

    return () => {
      setMyPresence('offline');
    };
  }, [effectiveChatId, currentUserId]);


  useEffect(() => {
    if (!contact?.id || !isChatActive) {
      setContactActiveAura(null);
      return;
    }
    const auraDocRef = doc(firestore, 'auras', contact.id);
    const unsubscribeAura = onSnapshot(auraDocRef, (docSnap) => {
      if (docSnap.exists() && isMountedRef.current) {
        const data = docSnap.data() as FirestoreAura;
        const createdAtDate = (data.createdAt as Timestamp)?.toDate();
        if (createdAtDate && (new Date().getTime() - createdAtDate.getTime() < AURA_EXPIRATION_MS)) {
          setContactActiveAura(AURA_OPTIONS.find(opt => opt.id === data.auraOptionId) || null);
        } else {
          setContactActiveAura(null);
        }
      } else if (isMountedRef.current) {
        setContactActiveAura(null);
      }
    });
    return () => unsubscribeAura();
  }, [contact?.id, isChatActive]);

  useEffect(() => {
    if (!effectiveChatId || !currentUserId || showRequestSpecificUI || !isMountedRef.current) return;
    const chatDocRef = doc(firestore, `chats/${effectiveChatId}`);
    const unsubscribe = onSnapshot(chatDocRef, async (docSnap) => {
      if (docSnap.exists() && isMountedRef.current) {
        const firestoreChatData = docSnap.data() as Chat;
        const contactId = firestoreChatData.participants?.find(pId => pId !== currentUserId);

        if (contactId) {
            setIsContactTyping(firestoreChatData.typingStatus?.[contactId] === true);
            setContactPresence(firestoreChatData.chatSpecificPresence?.[contactId] || null);
        } else {
            setIsContactTyping(false);
            setContactPresence(null);
        }
        
        let chatName = 'Chat'; let chatAvatarUrl: string | undefined | null = undefined;
        if (contactId) {
          const contactPInfo = firestoreChatData.participantInfo?.[contactId];
          chatName = contactPInfo?.name || 'Contact'; chatAvatarUrl = contactPInfo?.avatarUrl || undefined;
        }
        const finalChatName = firestoreChatData.type === 'group' ? (firestoreChatData.name || 'Group Chat') : chatName;
        const finalAvatarUrl = firestoreChatData.type === 'group' ? (firestoreChatData.avatarUrl) : chatAvatarUrl;
        setChatDetails({ ...firestoreChatData, name: finalChatName, avatarUrl: finalAvatarUrl });
      } else if (isMountedRef.current && !initialRouteChatId.startsWith('req_')) { setChatDetails(null); }
    });
    return () => unsubscribe();
  }, [effectiveChatId, currentUserId, showRequestSpecificUI, initialRouteChatId]);

  // Send debounced typing status
  useEffect(() => {
    if (!isChatActive || !effectiveChatId || !currentUserId) return;
    const chatDocRef = doc(firestore, 'chats', effectiveChatId);

    const setTypingStatus = (isTyping: boolean) => {
      setDoc(chatDocRef, { typingStatus: { [currentUserId]: isTyping } }, { merge: true })
        .catch(err => console.error("Failed to set typing status:", err));
    };

    if (newMessage.trim().length > 0) {
      setTypingStatus(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(false);
      }, 3000);
    } else {
        clearTimeout(typingTimeoutRef.current);
        setTypingStatus(false);
    }

    return () => clearTimeout(typingTimeoutRef.current);
  }, [newMessage, effectiveChatId, currentUserId, isChatActive]);

  useEffect(() => {
    if (!effectiveChatId || !currentUserId || showRequestSpecificUI || !isChatActive || !isMountedRef.current) {
      setMessages([]);
      return;
    }
    const messagesQuery = query(collection(firestore, `chats/${effectiveChatId}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
      if (!isMountedRef.current) return;
      
      const decryptionPromises: Promise<Message>[] = querySnapshot.docs.map(async docSnap => {
        const data = docSnap.data();
        const firestoreId = docSnap.id;
        let decryptedText = data.text;
        let decryptionError: 'DECRYPTION_FAILED' | undefined = undefined;

        if (data.encryptedText && currentUserId) {
          if (privateKeyExists) {
            try {
              decryptedText = await decryptMessage(data, currentUserId);
            } catch (e) {
              console.error(`Decryption failed for message ${firestoreId}:`, e);
              decryptionError = 'DECRYPTION_FAILED';
              decryptedText = '[Message could not be decrypted]';
            }
          } else {
            decryptionError = 'DECRYPTION_FAILED';
            decryptedText = '[Encrypted message - Restore backup to read]';
          }
        }
        
        return {
          id: firestoreId,
          firestoreId: firestoreId,
          chatId: effectiveChatId,
          senderId: data.senderId,
          text: decryptedText,
          timestamp: (data.timestamp as Timestamp)?.toMillis() || Date.now(),
          type: data.type || 'text',
          mediaUrl: data.mediaUrl,
          readBy: data.readBy || [],
          encryptedText: data.encryptedText,
          iv: data.iv,
          encryptedKeys: data.encryptedKeys,
          error: decryptionError,
        };
      });

      Promise.all(decryptionPromises).then(decryptedMessages => {
        if (!isMountedRef.current) return;

        const batchForReadUpdates = writeBatch(firestore);
        let markReadUpdatesMade = false;

        decryptedMessages.forEach(msg => {
          if (msg.senderId !== currentUserId && currentUserId && (!msg.readBy || !msg.readBy.includes(currentUserId))) {
            const messageRef = doc(firestore, `chats/${effectiveChatId}/messages`, msg.id);
            batchForReadUpdates.update(messageRef, { readBy: arrayUnion(currentUserId) });
            markReadUpdatesMade = true;
          }
        });
        
        setMessages(decryptedMessages);

        if (markReadUpdatesMade && currentUserId) {
          const chatDocRefForUpdate = doc(firestore, `chats/${effectiveChatId}`);
          batchForReadUpdates.update(chatDocRefForUpdate, { updatedAt: serverTimestamp() });
          batchForReadUpdates.commit().catch(err => console.error("Error marking messages as read:", err));
        }
      });
    });
    return () => unsubscribeMessages();
  }, [effectiveChatId, currentUserId, toast, isChatActive, showRequestSpecificUI, privateKeyExists]);

  const processAndSendMessage = async () => {
    if (newMessage.trim() === '' || !authUser?.id || !effectiveChatId || !contact) return;
    if (!showInputArea) { toast({ variant: "destructive", title: "Cannot Send", description: "This chat is not active for sending messages."}); return; }

    const textToSend = newMessage.trim();
    const currentSenderId = authUser.id;
    setNewMessage('');
    clearTimeout(typingTimeoutRef.current);
    
    try {
      const encryptedPayload = await encryptMessage(textToSend, [contact.id], currentSenderId);
      
      const messageDataForFirestore = {
        senderId: currentSenderId,
        type: 'text',
        timestamp: serverTimestamp(),
        readBy: [currentSenderId],
        ...encryptedPayload
      };
      
      const chatDocRef = doc(firestore, `chats/${effectiveChatId}`);
      const newMessageRef = collection(firestore, `chats/${effectiveChatId}/messages`);
    
      await addDoc(newMessageRef, messageDataForFirestore);
      
      const participantInfoMap: { [uid: string]: ParticipantInfo } = {
          [currentSenderId]: { name: authUser.name || 'You', avatarUrl: authUser.avatarUrl || null },
          [contact.id]: { name: contact.name || 'User', avatarUrl: contact.avatarUrl || null }
      };
      if (chatDetails?.participantInfo) Object.assign(participantInfoMap, chatDetails.participantInfo);

      const chatDataForUpdate = {
        type: 'individual',
        participants: [currentSenderId, contact.id].sort(),
        participantInfo: participantInfoMap,
        lastMessage: {
           senderId: currentSenderId, 
           timestamp: serverTimestamp(), 
           type: 'text', 
           readBy: [currentSenderId],
           ...encryptedPayload
        },
        updatedAt: serverTimestamp(),
        typingStatus: { [currentSenderId]: false }
      };

      await setDoc(chatDocRef, chatDataForUpdate, { merge: true });
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Send Error', description: error.message || 'Failed to encrypt or send message.' });
      setNewMessage(textToSend); // Restore message on failure
    }
  };

  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewMessage(prevMessage => prevMessage + emoji);
    justSelectedEmojiRef.current = true;
    setTimeout(() => { if (isMountedRef.current) justSelectedEmojiRef.current = false; }, 0);
  }, [setNewMessage]);
  
  const toggleEmojiPicker = () => {
    const nextEmojiState = !isEmojiPickerOpen;
    setIsEmojiPickerOpen(nextEmojiState);
  };
  
  const handleAcceptRequest = async () => {
    if (!chatDetails || !contact || !currentUserId || !authUser || !chatDetails.requesterId) { return; }
    setIsProcessingRequestAction(true);
    try {
      const receivedRequestRef = doc(firestore, `bharatConnectUsers/${currentUserId}/requestsReceived`, contact.id);
      const sentRequestRef = doc(firestore, `bharatConnectUsers/${contact.id}/requestsSent`, currentUserId);
      const updateData = { status: 'accepted', timestamp: serverTimestamp() };
      const batchDb = writeBatch(firestore); batchDb.update(receivedRequestRef, updateData); batchDb.update(sentRequestRef, updateData);
      const standardChatId = generateChatId(currentUserId, contact.id);
      const chatDocRef = doc(firestore, `chats/${standardChatId}`);
      const participantInfoMap: { [uid: string]: ParticipantInfo } = {
        [currentUserId]: { name: authUser.name || 'You', avatarUrl: authUser.avatarUrl || null },
        [contact.id]: { name: contact.name, avatarUrl: contact.avatarUrl || null }
      };
      batchDb.set(chatDocRef, { id: standardChatId, type: 'individual', participants: [currentUserId, contact.id].sort(), participantInfo: participantInfoMap, lastMessage: { text: "You are now connected.", senderId: "system", timestamp: serverTimestamp(), type: "system", readBy: [currentUserId, contact.id] }, updatedAt: serverTimestamp(), acceptedTimestamp: serverTimestamp(), typingStatus: {}, chatSpecificPresence: {} }, { merge: true });
      await batchDb.commit();
      if (isMountedRef.current) { 
        setChatDetails(prev => prev ? {...prev, requestStatus: 'accepted', id: standardChatId} : null); 
        setEffectiveChatId(standardChatId); 
      }
      chatContext.setChats(prevChats => prevChats.map(c => c.id === initialRouteChatId ? {...c, requestStatus: 'accepted', id: standardChatId, participants: [currentUserId, contact.id]} : c));
      router.replace(`/chat/${standardChatId}`, { scroll: false }); 
      toast({ title: "Request Accepted!", description: `You can now chat with ${contact.name}.` });
    } catch (error: any) { toast({ variant: "destructive", title: "Action Failed", description: `Could not accept request. ${error.message}` });
    } finally { if (isMountedRef.current) setIsProcessingRequestAction(false); }
  };

  const handleRejectRequest = async () => { /* ... (no changes) ... */ };
  const handleCancelRequest = async () => { /* ... (no changes) ... */ };

  const getDynamicStatus = () => {
    if (!isChatActive || !contact) return "Offline";
    if (isContactTyping) return "Typing...";
    
    if (contactPresence?.state === 'online') {
      return 'online';
    }
    
    if (contactPresence?.lastChanged) {
      try {
        const lastChangedDate = (contactPresence.lastChanged as Timestamp)?.toDate();
        if (lastChangedDate) {
            return `last seen ${formatDistanceToNowStrict(lastChangedDate, { addSuffix: true })}`;
        }
      } catch (e) {
        return 'Offline';
      }
    }

    return 'Offline';
  };
  
  const contactStatusText = getDynamicStatus();
  const contactAuraIconUrl = isContactTyping ? null : (contactActiveAura ? contactActiveAura.iconUrl : undefined);
  const contactAuraName = isContactTyping ? null : (contactActiveAura ? contactActiveAura.name : undefined);
  const headerContactName = contact?.name || chatDetails?.name || (chatDetails?.participantInfo && chatDetails.contactUserId && chatDetails.participantInfo[chatDetails.contactUserId]?.name) || 'Chat';
  const headerContactAvatar = contact?.avatarUrl || chatDetails?.avatarUrl || (chatDetails?.participantInfo && chatDetails.contactUserId && chatDetails.participantInfo[chatDetails.contactUserId]?.avatarUrl);

  const memoizedEmojiPicker = useMemo(() => <EmojiPicker onEmojiSelect={handleEmojiSelect} />, [handleEmojiSelect]);

  if (isAuthLoading || isPageLoading || privateKeyExists === null) return ( <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /><p className="mt-4 text-muted-foreground text-center">Loading Chat...</p></div> );
  if (!isAuthenticated && !isAuthLoading) return ( <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center"><p className="text-muted-foreground text-center">Redirecting...</p></div> );
  if (!initialRouteChatId || ((!chatDetails && !isPotentiallyNewChat) || (!contact && (isChatActive || showRequestSpecificUI )))) return ( <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center p-4"><Card className="w-full max-w-md text-center"><CardHeader><MessageSquareX className="w-16 h-16 text-destructive mx-auto mb-4" /><CardTitle className="text-2xl">Chat Not Found</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">The chat (ID: {effectiveChatId || initialRouteChatId}) could not be loaded.</p></CardContent><CardFooter className="flex flex-col space-y-3"><Button onClick={() => router.push('/')} className="w-full">Go to Chats</Button><Button variant="outline" onClick={() => router.back()} className="w-full">Go Back</Button></CardFooter></Card></div> );

  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
      <ChatPageHeader
        contactName={headerContactName}
        contactId={contact?.id}
        contactAvatarUrl={headerContactAvatar}
        contactStatusText={contactStatusText}
        contactAuraIconUrl={contactAuraIconUrl}
        contactAuraName={contactAuraName}
        isChatActive={isChatActive}
        onMoreOptionsClick={() => toast({ title: "Coming Soon!", description: "More chat options are on the way." })}
      />
      
      {privateKeyExists === false && isChatActive && <EncryptedChatBanner />}

      {showRequestSpecificUI && chatDetails && contact && currentUserId ? (
        <ChatRequestDisplay
          chatDetails={chatDetails} contact={contact} currentUserId={currentUserId}
          onAcceptRequest={handleAcceptRequest} onRejectRequest={handleRejectRequest} onCancelRequest={handleCancelRequest}
          isProcessing={isProcessingRequestAction}
        />
      ) : (
        <>
          <MessageArea
            messages={messages}
            currentUserId={currentUserId!} 
            contactId={contact?.id || null}
            dynamicPaddingBottom={dynamicPaddingBottom}
            isContactTyping={isContactTyping}
          />
          
          {showInputArea && ( 
            <div ref={bottomBarRef} className="shrink-0">
              <ChatInputZone
                newMessage={newMessage} onNewMessageChange={setNewMessage} onSendMessage={processAndSendMessage}
                onToggleEmojiPicker={toggleEmojiPicker} isEmojiPickerOpen={isEmojiPickerOpen}
                textareaRef={textareaRef} isDisabled={!isChatActive} justSelectedEmoji={justSelectedEmojiRef.current}
              />
            </div>
          )}
          {showInputArea && isEmojiPickerOpen && ( 
            <div ref={emojiPickerRef} className="shrink-0" style={{ height: `${EMOJI_PICKER_HEIGHT_PX}px` }}>
              {memoizedEmojiPicker}
            </div>
          )}
        </>
      )}
    </div>
  );
}
