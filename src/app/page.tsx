
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import BottomNavigationBar from '@/components/bottom-navigation-bar';
import HomeHeader from '@/components/home/home-header';
import AuraBar from '@/components/home/aura-bar';
import ChatList from '@/components/home/chat-list';
import RestoreBackupPrompt from '@/components/home/RestoreBackupPrompt';
import type { User, Chat, ParticipantInfo, DisplayAura, FirestoreAura, UserAura as UserAuraType, UserStatusDoc } from '@/types';
import { AURA_OPTIONS } from '@/types';
import { Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat as useChatContextHook } from '@/contexts/ChatContext';
import SwipeablePageWrapper from '@/components/shared/SwipeablePageWrapper';
import { useToast } from '@/hooks/use-toast';
import { firestore, getFirebaseTimestampMinutesAgo, Timestamp } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, type FirestoreError, limit, getDocs, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { getUserFullProfile } from '@/services/profileService';
import { decryptMessage } from '@/services/encryptionService';

const HEADER_HEIGHT_PX = 64;
const BOTTOM_NAV_HEIGHT_PX = 64;
const SCROLL_DELTA = 5;
const UNREAD_COUNT_MESSAGE_FETCH_LIMIT = 15;
const AURA_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour


function generateChatId(uid1: string, uid2: string): string {
  if (!uid1 || !uid2) {
    return `error_generating_chat_id_with_undefined_uids_${uid1}_${uid2}`;
  }
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

function timestampToMillisSafe(timestamp: any, defaultTimestamp: number = Date.now()): number {
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  if (typeof timestamp === 'object' && timestamp && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
    return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toMillis();
  }
  return defaultTimestamp;
}


export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { authUser, isAuthenticated, isAuthLoading } = useAuth();
  const { chats: contextChats, setChats: setContextChats, isLoadingChats: isContextChatsLoading } = useChatContextHook();

  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [privateKeyExists, setPrivateKeyExists] = useState<boolean | null>(null);
  const [isRestorePromptDismissed, setIsRestorePromptDismissed] = useState(false);

  // Raw data from Firestore listeners
  const [rawActiveChatDocs, setRawActiveChatDocs] = useState<DocumentData[]>([]);
  const [rawSentRequestDocs, setRawSentRequestDocs] = useState<DocumentData[]>([]);
  const [rawReceivedRequestDocs, setRawReceivedRequestDocs] = useState<DocumentData[]>([]);
  
  // Processed data
  const [liveActiveChats, setLiveActiveChats] = useState<Chat[]>([]);
  const [liveSentRequests, setLiveSentRequests] = useState<Chat[]>([]);
  const [liveReceivedRequests, setLiveReceivedRequests] = useState<Chat[]>([]);

  // Loading state management
  const [areListenersSetup, setAreListenersSetup] = useState(false);
  const [isProcessingData, setIsProcessingData] = useState(true);

  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const [isHeaderContentLoaded, setIsHeaderContentLoaded] = useState(true);
  
  const lastScrollYRef = useRef(0);

  const [allDisplayAuras, setAllDisplayAuras] = useState<DisplayAura[]>([]);
  const [isLoadingAuras, setIsLoadingAuras] = useState(true);

  useEffect(() => { setIsMounted(true); }, []);

  // On mount, check if the prompt has been dismissed in the current session.
  useEffect(() => {
    if (isMounted) {
      if (sessionStorage.getItem('restorePromptDismissed') === 'true') {
        setIsRestorePromptDismissed(true);
      }
    }
  }, [isMounted]);
  
  useEffect(() => {
    if (authUser?.id) {
      const key = localStorage.getItem(`privateKey_${authUser.id}`);
      setPrivateKeyExists(!!key);
    } else {
      setPrivateKeyExists(null); // Reset if user logs out
    }
  }, [authUser?.id]);

  const handleListenerError = useCallback((error: FirestoreError, context: string) => {
    if (error.code === 'permission-denied') {
        console.warn(`[HomePage] Firestore listener permission error for ${context}:`, error.message);
    } else {
        console.error(`[HomePage] Firestore listener error for ${context}:`, error);
        toast({
            variant: 'destructive',
            title: 'Network Error',
            description: `Could not load ${context}. Please check your connection.`
        });
    }
  }, [toast]);

  // Effect for Aura Bar
  useEffect(() => {
    if (!isMounted || !authUser?.id) {
      setIsLoadingAuras(false);
      setAllDisplayAuras([]);
      return;
    }
    setIsLoadingAuras(true);
    const aurasQuery = query(
      collection(firestore, 'auras'),
      where('createdAt', '>=', getFirebaseTimestampMinutesAgo(60)),
      orderBy('createdAt', 'desc')
    );
    console.log(`[HomePage] Setting up listener for ALL active auras (last 60 minutes).`);

    const unsubscribeAuras = onSnapshot(aurasQuery, async (snapshot) => {
      console.log(`[HomePage] Aura snapshot received. Docs count: ${snapshot.size}`);
      const fetchedDisplayAuras: DisplayAura[] = [];
      for (const auraDoc of snapshot.docs) {
        const firestoreAura = auraDoc.data() as FirestoreAura;
        let createdAtMs: number | null = null;
        if (firestoreAura.createdAt && typeof (firestoreAura.createdAt as Timestamp).toDate === 'function') {
            createdAtMs = (firestoreAura.createdAt as Timestamp).toMillis();
        }

        if (!createdAtMs || (Date.now() - createdAtMs >= AURA_EXPIRATION_MS)) {
          console.log(`[HomePage] Aura ${auraDoc.id} skipped (expired or invalid createdAt).`);
          continue;
        }

        const userProfile = await getUserFullProfile(firestoreAura.userId);
        if (userProfile) {
          const auraStyle = AURA_OPTIONS.find(opt => opt.id === firestoreAura.auraOptionId);
          fetchedDisplayAuras.push({
            id: auraDoc.id,
            userId: firestoreAura.userId,
            auraOptionId: firestoreAura.auraOptionId,
            createdAt: createdAtMs,
            userName: userProfile.name || 'User',
            userProfileAvatarUrl: userProfile.avatarUrl,
            auraStyle: auraStyle || null,
          });
        } else {
          console.warn(`[HomePage] No profile found for user ${firestoreAura.userId} associated with aura ${auraDoc.id}`);
        }
      }
      fetchedDisplayAuras.sort((a, b) => {
        if (a.userId === authUser.id) return -1;
        if (b.userId === authUser.id) return 1;
        return b.createdAt - a.createdAt;
      });
      setAllDisplayAuras(fetchedDisplayAuras);
      setIsLoadingAuras(false);
      console.log(`[HomePage] Updated allDisplayAuras. Count: ${fetchedDisplayAuras.length}`);
    }, (error: FirestoreError) => {
      handleListenerError(error, 'auras');
      setIsLoadingAuras(false);
    });

    return () => {
      console.log(`[HomePage] Unsubscribing listener for ALL active auras.`);
      unsubscribeAuras();
    };
  }, [isMounted, authUser?.id, handleListenerError]);

  const connectedUserIds = useMemo(() => {
    if (!authUser?.id || contextChats.length === 0) {
      return [];
    }
    return Array.from(new Set(
      contextChats
        .filter(chat =>
          chat.type === 'individual' &&
          chat.participants.includes(authUser.id) &&
          (chat.requestStatus === 'accepted' || !chat.requestStatus || chat.requestStatus === 'none') &&
          chat.contactUserId && chat.contactUserId !== authUser.id
        )
        .map(chat => chat.contactUserId!)
    ));
  }, [authUser?.id, contextChats]);

  // EFFECT 1: SETUP LISTENERS. Depends only on auth state.
  useEffect(() => {
    if (!isMounted || !authUser?.id || isAuthLoading) {
      setAreListenersSetup(false);
      return;
    }
    
    setAreListenersSetup(true);

    const activeChatsQuery = query(collection(firestore, 'chats'), where('participants', 'array-contains', authUser.id), orderBy('updatedAt', 'desc'));
    const unsubActive = onSnapshot(activeChatsQuery, (snapshot) => {
      setRawActiveChatDocs(snapshot.docs.map(d => ({...d.data(), id: d.id})));
    }, (error) => handleListenerError(error, 'active chats'));

    const sentRequestsQuery = query(collection(firestore, `bharatConnectUsers/${authUser.id}/requestsSent`), where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const unsubSent = onSnapshot(sentRequestsQuery, (snapshot) => {
      setRawSentRequestDocs(snapshot.docs.map(d => ({...d.data(), id: d.id})));
    }, (error) => handleListenerError(error, 'sent requests'));

    const receivedRequestsQuery = query(collection(firestore, `bharatConnectUsers/${authUser.id}/requestsReceived`), where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const unsubReceived = onSnapshot(receivedRequestsQuery, (snapshot) => {
      setRawReceivedRequestDocs(snapshot.docs.map(d => ({...d.data(), id: d.id})));
    }, (error) => handleListenerError(error, 'received requests'));

    return () => {
      unsubActive();
      unsubSent();
      unsubReceived();
      setAreListenersSetup(false);
    };
  }, [isMounted, authUser?.id, isAuthLoading, handleListenerError]);


  // EFFECT 2: PROCESS RAW DATA. Depends on raw data & enrichment data (auras, etc.)
  useEffect(() => {
    if (!areListenersSetup || !authUser?.id || !authUser.name) {
      return;
    }

    const processData = async () => {
      setIsProcessingData(true);

      const processActiveChats = async () => {
        const activeChatsPromises = rawActiveChatDocs.map(async (data): Promise<Chat | null> => {
          const contactId = data.participants?.find((pId: string) => pId !== authUser.id);
          let participantInfoMap: { [uid: string]: ParticipantInfo } = { ...(data.participantInfo || {}) };
          let chatTopLevelName = 'Chat User'; let chatTopLevelAvatar: string | undefined | null = undefined;

          if (data.type === 'individual' && contactId) {
            const profile = await getUserFullProfile(contactId);
            const fetchedContactName = profile?.name || participantInfoMap[contactId]?.name || 'User';
            const fetchedContactAvatar = profile?.avatarUrl || participantInfoMap[contactId]?.avatarUrl || undefined;
            const contactAuraFromState = allDisplayAuras.find(da => da.userId === contactId);

            let hasActiveUnviewedStatus = false; let hasActiveViewedStatus = false;
            const statusSnap = await getDoc(doc(firestore, 'status', contactId));
            if (statusSnap.exists()) {
              const statusData = statusSnap.data() as UserStatusDoc;
              const isActiveNow = statusData.isActive && statusData.expiresAt && (statusData.expiresAt as Timestamp).toMillis() > Date.now() && statusData.media?.length > 0;
              if (isActiveNow) {
                if (statusData.media.every(item => item.viewers?.includes(authUser.id!))) {
                  hasActiveViewedStatus = true;
                } else {
                  hasActiveUnviewedStatus = true;
                }
              }
            }
            participantInfoMap[contactId] = { name: fetchedContactName, avatarUrl: fetchedContactAvatar, currentAuraId: contactAuraFromState?.auraOptionId || null, hasActiveUnviewedStatus, hasActiveViewedStatus };
            chatTopLevelName = fetchedContactName; chatTopLevelAvatar = fetchedContactAvatar;
          } else if (data.type === 'group') {
            chatTopLevelName = data.name || 'Group Chat'; chatTopLevelAvatar = data.avatarUrl || undefined;
          }

          if (!participantInfoMap[authUser.id] && authUser.name) {
             const currentUserAuraFromState = allDisplayAuras.find(da => da.userId === authUser.id);
             participantInfoMap[authUser.id] = { name: authUser.name, avatarUrl: authUser.avatarUrl || null, currentAuraId: currentUserAuraFromState?.auraOptionId || null };
          }
          
          let lastMessageWithDecryptedText = null;
          if (data.lastMessage) {
            let decryptedText = data.lastMessage.text;
            if (data.lastMessage.encryptedText && authUser.id && privateKeyExists) {
              try { decryptedText = await decryptMessage(data.lastMessage, authUser.id); } 
              catch (e) { decryptedText = 'Encrypted message'; }
            } else if (data.lastMessage.encryptedText && !privateKeyExists) {
              decryptedText = 'Encrypted message';
            } else if (!data.lastMessage.text) { decryptedText = '...'; }
            lastMessageWithDecryptedText = { ...data.lastMessage, text: decryptedText, timestamp: timestampToMillisSafe(data.lastMessage.timestamp), readBy: data.lastMessage.readBy || [] };
          }

          let calculatedUnreadCount = 0;
          if ((data.type === 'individual' || data.type === 'group') && authUser.id) {
              try {
                  const msgSnapshot = await getDocs(query(collection(firestore, `chats/${data.id}/messages`), orderBy('timestamp', 'desc'), limit(UNREAD_COUNT_MESSAGE_FETCH_LIMIT)));
                  msgSnapshot.forEach(docSnap => { const msg = docSnap.data(); if (msg.senderId !== authUser.id && !msg.readBy?.includes(authUser.id)) calculatedUnreadCount++; });
              } catch (err) { if (data.lastMessage?.senderId !== authUser.id && !data.lastMessage.readBy?.includes(authUser.id)) calculatedUnreadCount = 1;}
          }
          return {
            id: data.id, type: data.type || 'individual', name: chatTopLevelName, avatarUrl: chatTopLevelAvatar,
            participants: data.participants || [], participantInfo: participantInfoMap,
            lastMessage: lastMessageWithDecryptedText, updatedAt: timestampToMillisSafe(data.updatedAt), unreadCount: calculatedUnreadCount,
            contactUserId: (data.type === 'individual' && contactId) ? contactId : undefined,
            requestStatus: 'accepted', acceptedTimestamp: data.acceptedTimestamp ? timestampToMillisSafe(data.acceptedTimestamp) : undefined,
          };
        });
        setLiveActiveChats((await Promise.all(activeChatsPromises)).filter(Boolean) as Chat[]);
      };

      const processSentRequests = async () => {
        const requestsData = await Promise.all(rawSentRequestDocs.map(async (data): Promise<Chat | null> => {
          const contactUserId = data.to as string; if (!contactUserId) return null;
          let contactName = data.name || 'User'; let contactAvatar = data.photoURL || undefined;
          try { const profile = await getUserFullProfile(contactUserId); contactName = profile?.name || contactName; contactAvatar = profile?.avatarUrl || contactAvatar; } catch { /* ignore */ }
          const contactAuraFromState = allDisplayAuras.find(da => da.userId === contactUserId);
          const currentUserAuraFromState = allDisplayAuras.find(da => da.userId === authUser.id);
          return {
            id: `req_sent_${contactUserId}`, type: 'individual', name: contactName, contactUserId: contactUserId, participants: [authUser.id!, contactUserId],
            participantInfo: { [authUser.id!]: { name: authUser.name!, avatarUrl: authUser.avatarUrl || null, currentAuraId: currentUserAuraFromState?.auraOptionId || null }, [contactUserId]: { name: contactName, avatarUrl: contactAvatar, currentAuraId: contactAuraFromState?.auraOptionId || null }},
            lastMessage: { text: data.firstMessageTextPreview || "Request sent...", senderId: authUser.id!, timestamp: timestampToMillisSafe(data.timestamp), type: 'text', readBy: [authUser.id!]},
            updatedAt: timestampToMillisSafe(data.timestamp), unreadCount: 0, avatarUrl: contactAvatar,
            requestStatus: 'pending', requesterId: authUser.id!, firstMessageTextPreview: data.firstMessageTextPreview || "Request sent...",
          };
        }));
        setLiveSentRequests(requestsData.filter(Boolean) as Chat[]);
      };
      
      const processReceivedRequests = async () => {
        const requestsData = await Promise.all(rawReceivedRequestDocs.map(async (data): Promise<Chat | null> => {
          const contactUserId = data.from as string; if (!contactUserId) return null;
          let contactName = data.name || 'User'; let contactAvatar = data.photoURL || undefined;
          try { const profile = await getUserFullProfile(contactUserId); contactName = profile?.name || contactName; contactAvatar = profile?.avatarUrl || contactAvatar; } catch { /* ignore */ }
          const contactAuraFromState = allDisplayAuras.find(da => da.userId === contactUserId);
          const currentUserAuraFromState = allDisplayAuras.find(da => da.userId === authUser.id);
          return {
            id: `req_rec_${contactUserId}`, type: 'individual', name: contactName, contactUserId: contactUserId, participants: [authUser.id!, contactUserId],
            participantInfo: { [authUser.id!]: { name: authUser.name!, avatarUrl: authUser.avatarUrl || null, currentAuraId: currentUserAuraFromState?.auraOptionId || null }, [contactUserId]: { name: contactName, avatarUrl: contactAvatar, currentAuraId: contactAuraFromState?.auraOptionId || null }},
            lastMessage: { text: data.firstMessageTextPreview || "Wants to connect...", senderId: contactUserId, timestamp: timestampToMillisSafe(data.timestamp), type: 'text', readBy: [contactUserId] },
            updatedAt: timestampToMillisSafe(data.timestamp), unreadCount: 1, avatarUrl: contactAvatar,
            requestStatus: 'awaiting_action', requesterId: contactUserId, firstMessageTextPreview: data.firstMessageTextPreview || "Wants to connect...",
          };
        }));
        setLiveReceivedRequests(requestsData.filter(Boolean) as Chat[]);
      };

      await Promise.all([processActiveChats(), processSentRequests(), processReceivedRequests()]);
      setIsProcessingData(false);
    };

    processData();

  }, [rawActiveChatDocs, rawSentRequestDocs, rawReceivedRequestDocs, allDisplayAuras, privateKeyExists, authUser, areListenersSetup]);

  // EFFECT 3: COMBINE & SORT DATA. Depends on processed data.
  useEffect(() => {
    if (isProcessingData || !authUser?.id) return;
    
    const combinedChatsMap = new Map<string, Chat>();
    liveActiveChats.forEach(chat => combinedChatsMap.set(chat.id, chat));
    liveSentRequests.forEach(req => { if (req.contactUserId) { const activeChatIdToCheck = generateChatId(authUser.id, req.contactUserId); if (!combinedChatsMap.has(activeChatIdToCheck)) combinedChatsMap.set(req.id, req); } });
    liveReceivedRequests.forEach(req => { if (req.contactUserId) { const activeChatIdToCheck = generateChatId(authUser.id, req.contactUserId); const sentRequestIdToCheck = `req_sent_${req.contactUserId}`; if (!combinedChatsMap.has(activeChatIdToCheck) && !combinedChatsMap.has(sentRequestIdToCheck)) { if (!combinedChatsMap.has(req.id)) combinedChatsMap.set(req.id, req); } } });

    const finalChatsArray = Array.from(combinedChatsMap.values());
    const getChatSortPriority = (chat: Chat): number => { if (chat.requestStatus === 'awaiting_action') return 0; if (chat.unreadCount > 0) return 1; if (chat.requestStatus === 'pending') return 2; if (chat.requestStatus === 'rejected') return 4; return 3; };
    const sortedChats = finalChatsArray.sort((a, b) => { const priorityA = getChatSortPriority(a); const priorityB = getChatSortPriority(b); if (priorityA !== priorityB) return priorityA - priorityB; return (b.lastMessage?.timestamp || b.updatedAt || 0) - (a.lastMessage?.timestamp || a.updatedAt || 0); });

    setContextChats(sortedChats);
  }, [liveActiveChats, liveSentRequests, liveReceivedRequests, authUser?.id, isProcessingData, setContextChats]);

  const handleScroll = useCallback(() => {
    if (scrollableContainerRef.current) {
      const { scrollTop } = scrollableContainerRef.current;
      if (Math.abs(scrollTop - lastScrollYRef.current) > SCROLL_DELTA) {
        setIsHeaderContentLoaded(scrollTop < lastScrollYRef.current || scrollTop < HEADER_HEIGHT_PX / 2);
        lastScrollYRef.current = scrollTop;
      }
    }
  }, []);

  useEffect(() => {
    const container = scrollableContainerRef.current;
    if (container && isAuthenticated) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [isAuthenticated, handleScroll]);
  
  const handleDismissRestorePrompt = () => {
    sessionStorage.setItem('restorePromptDismissed', 'true');
    setIsRestorePromptDismissed(true);
  };

  const showPageSpinner = !isMounted || isAuthLoading || (isAuthenticated && (isLoadingAuras || isProcessingData || privateKeyExists === null));
  
  const showTheRestorePrompt = 
    !isRestorePromptDismissed &&
    isAuthenticated &&
    privateKeyExists === false &&
    contextChats.length > 0;

  let mainContent;
  if (showPageSpinner) {
    mainContent = (
      <div className="flex-grow flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground text-center">Loading BharatConnect...</p>
      </div>
    );
  } else if (!isAuthenticated) {
    mainContent = (
      <div className="flex-grow flex flex-col items-center justify-center">
        <p className="text-muted-foreground text-center">Redirecting...</p>
      </div>
    );
  } else if (showTheRestorePrompt) {
    mainContent = (
      <SwipeablePageWrapper className="flex-grow flex flex-col bg-background overflow-hidden min-h-0">
        <main className="flex-grow flex flex-col bg-background overflow-y-auto hide-scrollbar min-h-0 w-full" style={{ paddingTop: `${HEADER_HEIGHT_PX}px`, paddingBottom: `${BOTTOM_NAV_HEIGHT_PX}px` }}>
            <RestoreBackupPrompt onDismiss={handleDismissRestorePrompt} />
        </main>
      </SwipeablePageWrapper>
    );
  } else {
    mainContent = (
        <SwipeablePageWrapper className="flex-grow flex flex-col bg-background overflow-hidden min-h-0">
            <main ref={scrollableContainerRef} className="flex-grow flex flex-col bg-background overflow-y-auto hide-scrollbar min-h-0 w-full" style={{ paddingTop: `${HEADER_HEIGHT_PX}px`, paddingBottom: `${BOTTOM_NAV_HEIGHT_PX}px` }}>
              <AuraBar
                isLoading={isLoadingAuras}
                allDisplayAuras={allDisplayAuras}
                currentUser={authUser}
                connectedUserIds={connectedUserIds}
              />
              {authUser?.id && ( <ChatList isLoading={isContextChatsLoading && contextChats.length === 0} filteredChats={contextChats} searchTerm={searchTerm} currentUserId={authUser.id} /> )}
            </main>
        </SwipeablePageWrapper>
    );
  }

  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
      <HomeHeader isHeaderContentLoaded={isHeaderContentLoaded} />
      {mainContent}
      <Button variant="default" size="icon" className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-xl bg-gradient-bharatconnect-bubble text-primary-foreground hover:opacity-90 transition-opacity z-30" aria-label="New chat" onClick={() => router.push('/search')}>
        <Plus className="w-7 h-7" />
      </Button>
      <BottomNavigationBar />
    </div>
  );
}
