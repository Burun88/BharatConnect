
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
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, type FirestoreError, limit, getDocs, serverTimestamp } from 'firebase/firestore';
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
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [privateKeyExists, setPrivateKeyExists] = useState<boolean | null>(null);

  const [liveActiveChats, setLiveActiveChats] = useState<Chat[]>([]);
  const [liveSentRequests, setLiveSentRequests] = useState<Chat[]>([]);
  const [liveReceivedRequests, setLiveReceivedRequests] = useState<Chat[]>([]);

  const [initialActiveChatsProcessed, setInitialActiveChatsProcessed] = useState(false);
  const [initialSentRequestsProcessed, setInitialSentRequestsProcessed] = useState(false);
  const [initialReceivedRequestsProcessed, setInitialReceivedRequestsProcessed] = useState(false);

  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const [isHeaderContentLoaded, setIsHeaderContentLoaded] = useState(true);
  const lastScrollYRef = useRef(0);
  const prevAuthUserIdRef = useRef<string | null | undefined>(null);

  const [allDisplayAuras, setAllDisplayAuras] = useState<DisplayAura[]>([]);
  const [isLoadingAuras, setIsLoadingAuras] = useState(true);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (authUser?.id) {
      const key = localStorage.getItem(`privateKey_${authUser.id}`);
      setPrivateKeyExists(!!key);
    } else {
      setPrivateKeyExists(null); // Reset if user logs out
    }
  }, [authUser?.id]);

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
      console.error("[HomePage] Error fetching auras:", error);
      toast({ variant: 'destructive', title: 'Aura Error', description: "Could not load auras from Firestore." });
      setIsLoadingAuras(false);
    });

    return () => {
      console.log(`[HomePage] Unsubscribing listener for ALL active auras.`);
      unsubscribeAuras();
    };
  }, [isMounted, authUser?.id, toast]);

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


  // Effect for Chat List Data Fetching
  useEffect(() => {
    if (!isMounted) return;
    let unsubActive: (() => void) | undefined, unsubSent: (() => void) | undefined, unsubReceived: (() => void) | undefined;

    const currentAuthUserId = authUser?.id;

    if (prevAuthUserIdRef.current !== currentAuthUserId) {
        console.log(`[HomePage CHAT_FETCH] Auth user changed from ${prevAuthUserIdRef.current} to ${currentAuthUserId}. Resetting chat loading states.`);
        setIsLoadingPageData(true); // Indicate fresh data load for chats specifically
        setInitialActiveChatsProcessed(false);
        setInitialSentRequestsProcessed(false);
        setInitialReceivedRequestsProcessed(false);
        setLiveActiveChats([]); // Clear previous user's data
        setLiveSentRequests([]);
        setLiveReceivedRequests([]);
    }
    prevAuthUserIdRef.current = currentAuthUserId;

    if (isAuthLoading || !isAuthenticated || !currentAuthUserId || !authUser?.name) {
      if (unsubActive) unsubActive(); if (unsubSent) unsubSent(); if (unsubReceived) unsubReceived();
      setLiveActiveChats([]); setLiveSentRequests([]); setLiveReceivedRequests([]);
      if (prevAuthUserIdRef.current === currentAuthUserId) {
          setInitialActiveChatsProcessed(true); setInitialSentRequestsProcessed(true); setInitialReceivedRequestsProcessed(true);
      }
      return;
    }

    // --- Active Chats Listener ---
    const activeChatsQuery = query(collection(firestore, 'chats'), where('participants', 'array-contains', currentAuthUserId), orderBy('updatedAt', 'desc'));
    unsubActive = onSnapshot(activeChatsQuery, async (snapshot) => {
      const latestAuthUser = authUser;
      if (!latestAuthUser?.id || !latestAuthUser.name) { setLiveActiveChats([]); if (!initialActiveChatsProcessed) setInitialActiveChatsProcessed(true); return; }
      const activeAuthUserIdInner = latestAuthUser.id;

      const activeChatsPromises = snapshot.docs.map(async (chatDoc): Promise<Chat | null> => {
        try {
          const data = chatDoc.data();
          const contactId = data.participants?.find((pId: string) => pId !== activeAuthUserIdInner);
          let participantInfoMap: { [uid: string]: ParticipantInfo } = { ...(data.participantInfo || {}) };
          let chatTopLevelName = 'Chat User';
          let chatTopLevelAvatar: string | undefined | null = undefined;

          if (data.type === 'individual' && contactId) {
            const profile = await getUserFullProfile(contactId);
            const fetchedContactName = profile?.name || participantInfoMap[contactId]?.name || 'User';
            const fetchedContactAvatar = profile?.avatarUrl || participantInfoMap[contactId]?.avatarUrl || undefined;
            const contactAuraFromState = allDisplayAuras.find(da => da.userId === contactId);
            
            let hasActiveUnviewedStatus = false;
            let hasActiveViewedStatus = false;
            const statusDocRef = doc(firestore, 'status', contactId);
            const statusSnap = await getDoc(statusDocRef);

            if (statusSnap.exists()) {
                const statusData = statusSnap.data() as UserStatusDoc;
                const isActiveNow = statusData.isActive && statusData.expiresAt && (statusData.expiresAt as Timestamp).toMillis() > Date.now() && statusData.media && statusData.media.length > 0;

                if (isActiveNow) {
                    const allItemsViewed = statusData.media.every(item => item.viewers?.includes(activeAuthUserIdInner));

                    if (allItemsViewed) {
                        hasActiveViewedStatus = true;
                        hasActiveUnviewedStatus = false;
                    } else {
                        hasActiveViewedStatus = false;
                        hasActiveUnviewedStatus = true;
                    }
                }
            }
            
            participantInfoMap[contactId] = { name: fetchedContactName, avatarUrl: fetchedContactAvatar, currentAuraId: contactAuraFromState?.auraOptionId || null, hasActiveUnviewedStatus, hasActiveViewedStatus };
            chatTopLevelName = fetchedContactName; chatTopLevelAvatar = fetchedContactAvatar;
          } else if (data.type === 'group') {
            chatTopLevelName = data.name || 'Group Chat'; chatTopLevelAvatar = data.avatarUrl || undefined;
          }

          if (!participantInfoMap[activeAuthUserIdInner] && latestAuthUser.name) {
            const currentUserAuraFromState = allDisplayAuras.find(da => da.userId === activeAuthUserIdInner);
            participantInfoMap[activeAuthUserIdInner] = { name: latestAuthUser.name, avatarUrl: latestAuthUser.avatarUrl || null, currentAuraId: currentUserAuraFromState?.auraOptionId || null };
          }
          
          let lastMessageWithDecryptedText = null;
          if (data.lastMessage) {
            let decryptedText = data.lastMessage.text;
            if (data.lastMessage.encryptedText && activeAuthUserIdInner && privateKeyExists) {
              try {
                decryptedText = await decryptMessage(data.lastMessage, activeAuthUserIdInner);
              } catch (e) {
                console.error(`Failed to decrypt last message for chat ${chatDoc.id}`, e);
                decryptedText = 'Encrypted message';
              }
            } else if (!data.lastMessage.text) {
               decryptedText = '...';
            }

            lastMessageWithDecryptedText = {
              ...data.lastMessage,
              text: decryptedText,
              timestamp: timestampToMillisSafe(data.lastMessage.timestamp),
              readBy: data.lastMessage.readBy || [],
            };
          }


          let calculatedUnreadCount = 0;
          if ((data.type === 'individual' || data.type === 'group') && activeAuthUserIdInner) {
              const messagesColRef = collection(firestore, `chats/${chatDoc.id}/messages`);
              const messagesQueryUnread = query(messagesColRef, orderBy('timestamp', 'desc'), limit(UNREAD_COUNT_MESSAGE_FETCH_LIMIT));
              try {
                  const msgSnapshot = await getDocs(messagesQueryUnread);
                  msgSnapshot.forEach(docSnap => { const msg = docSnap.data(); if (msg.senderId !== activeAuthUserIdInner && (!msg.readBy || !msg.readBy.includes(activeAuthUserIdInner))) calculatedUnreadCount++; });
              } catch (err) { if (data.lastMessage && data.lastMessage.senderId !== activeAuthUserIdInner && !data.lastMessage.readBy?.includes(activeAuthUserIdInner)) calculatedUnreadCount = 1;}
          }
          return {
            id: chatDoc.id, type: data.type || 'individual', name: chatTopLevelName, avatarUrl: chatTopLevelAvatar,
            participants: data.participants || [], participantInfo: participantInfoMap,
            lastMessage: lastMessageWithDecryptedText,
            updatedAt: timestampToMillisSafe(data.updatedAt), unreadCount: calculatedUnreadCount,
            contactUserId: (data.type === 'individual' && contactId) ? contactId : undefined,
            requestStatus: 'accepted', acceptedTimestamp: data.acceptedTimestamp ? timestampToMillisSafe(data.acceptedTimestamp) : undefined,
          };
        } catch (error) { console.error(`Error processing active chat ${chatDoc.id}:`, error); return null; }
      });
      try { const resolvedActiveChats = (await Promise.all(activeChatsPromises)).filter(Boolean) as Chat[]; setLiveActiveChats(resolvedActiveChats); }
      catch (promiseAllError) { console.error("Error resolving active chat promises:", promiseAllError); }
      if (!initialActiveChatsProcessed) setInitialActiveChatsProcessed(true);
    }, (error: FirestoreError) => { toast({ variant: 'destructive', title: 'Chat Error', description: `Active chats: ${error.message}`}); setLiveActiveChats([]); if (!initialActiveChatsProcessed) setInitialActiveChatsProcessed(true); });

    // --- Sent Requests Listener ---
    const sentRequestsQuery = query(collection(firestore, `bharatConnectUsers/${currentAuthUserId}/requestsSent`), where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    unsubSent = onSnapshot(sentRequestsQuery, async (snapshot) => {
       const latestAuthUser = authUser;
       if (!latestAuthUser?.id || !latestAuthUser.name) { setLiveSentRequests([]); if (!initialSentRequestsProcessed) setInitialSentRequestsProcessed(true); return; }
       const activeAuthUserIdInner = latestAuthUser.id;
       const requestsData: Chat[] = [];
       for (const requestDoc of snapshot.docs) {
         const data = requestDoc.data(); const contactUserId = data.to as string; if (!contactUserId) continue;
         let contactName = data.name || 'User'; let contactAvatar = data.photoURL || undefined;
         try { const profile = await getUserFullProfile(contactUserId); contactName = profile?.name || contactName; contactAvatar = profile?.avatarUrl || contactAvatar; } catch (profileError) { /* ignore */ }
         const contactAuraFromState = allDisplayAuras.find(da => da.userId === contactUserId);
         const currentUserAuraFromState = allDisplayAuras.find(da => da.userId === activeAuthUserIdInner);
         requestsData.push({
           id: `req_sent_${contactUserId}`, type: 'individual', name: contactName, contactUserId: contactUserId, participants: [activeAuthUserIdInner, contactUserId],
           participantInfo: { [activeAuthUserIdInner]: { name: latestAuthUser.name, avatarUrl: latestAuthUser.avatarUrl || null, currentAuraId: currentUserAuraFromState?.auraOptionId || null }, [contactUserId]: { name: contactName, avatarUrl: contactAvatar, currentAuraId: contactAuraFromState?.auraOptionId || null }},
           lastMessage: { text: data.firstMessageTextPreview || "Request sent...", senderId: activeAuthUserIdInner, timestamp: timestampToMillisSafe(data.timestamp), type: 'text', readBy: [activeAuthUserIdInner] },
           updatedAt: timestampToMillisSafe(data.timestamp), unreadCount: 0, avatarUrl: contactAvatar,
           requestStatus: 'pending', requesterId: activeAuthUserIdInner, firstMessageTextPreview: data.firstMessageTextPreview || "Request sent...",
         });
       }
       setLiveSentRequests(requestsData); if (!initialSentRequestsProcessed) setInitialSentRequestsProcessed(true);
    }, (error: FirestoreError) => { toast({ variant: 'destructive', title: 'Request Error', description: `Sent requests: ${error.message}`}); setLiveSentRequests([]); if (!initialSentRequestsProcessed) setInitialSentRequestsProcessed(true);});

    // --- Received Requests Listener ---
    const receivedRequestsQuery = query(collection(firestore, `bharatConnectUsers/${currentAuthUserId}/requestsReceived`), where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    unsubReceived = onSnapshot(receivedRequestsQuery, async (snapshot) => {
      const latestAuthUser = authUser;
      if (!latestAuthUser?.id || !latestAuthUser.name) { setLiveReceivedRequests([]); if (!initialReceivedRequestsProcessed) setInitialReceivedRequestsProcessed(true); return; }
      const activeAuthUserIdInner = latestAuthUser.id;
      const requestsData: Chat[] = [];
      for (const requestDoc of snapshot.docs) {
        const data = requestDoc.data(); const contactUserId = data.from as string; if (!contactUserId) continue;
        let contactName = data.name || 'User'; let contactAvatar = data.photoURL || undefined;
        try { const profile = await getUserFullProfile(contactUserId); contactName = profile?.name || contactName; contactAvatar = profile?.avatarUrl || contactAvatar; } catch (profileError) { /* ignore */ }
        const contactAuraFromState = allDisplayAuras.find(da => da.userId === contactUserId);
        const currentUserAuraFromState = allDisplayAuras.find(da => da.userId === activeAuthUserIdInner);
        requestsData.push({
          id: `req_rec_${contactUserId}`, type: 'individual', name: contactName, contactUserId: contactUserId, participants: [activeAuthUserIdInner, contactUserId],
          participantInfo: { [activeAuthUserIdInner]: { name: latestAuthUser.name, avatarUrl: latestAuthUser.avatarUrl || null, currentAuraId: currentUserAuraFromState?.auraOptionId || null }, [contactUserId]: { name: contactName, avatarUrl: contactAvatar, currentAuraId: contactAuraFromState?.auraOptionId || null }},
          lastMessage: { text: data.firstMessageTextPreview || "Wants to connect...", senderId: contactUserId, timestamp: timestampToMillisSafe(data.timestamp), type: 'text', readBy: [contactUserId] },
          updatedAt: timestampToMillisSafe(data.timestamp), unreadCount: 1, avatarUrl: contactAvatar,
          requestStatus: 'awaiting_action', requesterId: contactUserId, firstMessageTextPreview: data.firstMessageTextPreview || "Wants to connect...",
        });
      }
      setLiveReceivedRequests(requestsData); if (!initialReceivedRequestsProcessed) setInitialReceivedRequestsProcessed(true);
    }, (error: FirestoreError) => { toast({ variant: 'destructive', title: 'Request Error', description: `Received requests: ${error.message}`}); setLiveReceivedRequests([]); if (!initialReceivedRequestsProcessed) setInitialReceivedRequestsProcessed(true);});

    return () => { if (unsubActive) unsubActive(); if (unsubSent) unsubSent(); if (unsubReceived) unsubReceived(); };
  }, [authUser, isAuthenticated, isAuthLoading, isMounted, toast, allDisplayAuras, privateKeyExists]);

  // Combine and sort chats for ChatContext and local page loading state
  useEffect(() => {
    if (!isMounted || isAuthLoading || !authUser || !authUser.id || !authUser.name) {
      setContextChats([]);
      if (isLoadingPageData && !isAuthLoading) setIsLoadingPageData(false);
      return;
    }

    const allInitialSnapshotsHaveFired = initialActiveChatsProcessed && initialSentRequestsProcessed && initialReceivedRequestsProcessed;

    if (allInitialSnapshotsHaveFired) {
      const currentAuthUserId = authUser.id;
      const combinedChatsMap = new Map<string, Chat>();
      liveActiveChats.forEach(chat => combinedChatsMap.set(chat.id, chat));
      liveSentRequests.forEach(req => { if (req.contactUserId) { const activeChatIdToCheck = generateChatId(currentAuthUserId, req.contactUserId); if (!combinedChatsMap.has(activeChatIdToCheck)) combinedChatsMap.set(req.id, req); } });
      liveReceivedRequests.forEach(req => { if (req.contactUserId) { const activeChatIdToCheck = generateChatId(currentAuthUserId, req.contactUserId); const sentRequestIdToCheck = `req_sent_${req.contactUserId}`; if (!combinedChatsMap.has(activeChatIdToCheck) && !combinedChatsMap.has(sentRequestIdToCheck)) { if (!combinedChatsMap.has(req.id)) combinedChatsMap.set(req.id, req); } } });

      const finalChatsArray = Array.from(combinedChatsMap.values());
      const getChatSortPriority = (chat: Chat): number => { if (chat.requestStatus === 'awaiting_action' && chat.requesterId !== currentAuthUserId) return 0; if (chat.unreadCount > 0 && (chat.requestStatus === 'accepted' || !chat.requestStatus)) return 1; if (chat.requestStatus === 'pending' && chat.requesterId === currentAuthUserId) return 2; if (chat.requestStatus === 'accepted' || !chat.requestStatus || chat.requestStatus === 'none') return 3; if (chat.requestStatus === 'rejected') return 4; return 3; };
      const sortedChats = finalChatsArray.sort((a, b) => { const priorityA = getChatSortPriority(a); const priorityB = getChatSortPriority(b); if (priorityA !== priorityB) return priorityA - priorityB; return (b.lastMessage?.timestamp || b.updatedAt || 0) - (a.lastMessage?.timestamp || a.updatedAt || 0); });

      setContextChats(sortedChats);
      if (isLoadingPageData) setIsLoadingPageData(false);
    }
  }, [ liveActiveChats, liveSentRequests, liveReceivedRequests, authUser, isAuthenticated, isAuthLoading, isMounted, setContextChats,
       initialActiveChatsProcessed, initialSentRequestsProcessed, initialReceivedRequestsProcessed, isLoadingPageData ]);

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
    if (isLoadingPageData || !isAuthenticated || !isMounted) return;
    const container = scrollableContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [isLoadingPageData, isAuthenticated, handleScroll, isMounted]);

  const showPageSpinner = !isMounted || isAuthLoading || (isAuthenticated && (isLoadingAuras || isLoadingPageData || privateKeyExists === null));
  const showRestorePrompt = privateKeyExists === false && contextChats.length > 0;

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
  } else if (showRestorePrompt) {
    mainContent = (
      <SwipeablePageWrapper className="flex-grow flex flex-col bg-background overflow-hidden min-h-0">
        <main className="flex-grow flex flex-col bg-background overflow-y-auto hide-scrollbar min-h-0 w-full" style={{ paddingTop: `${HEADER_HEIGHT_PX}px`, paddingBottom: `${BOTTOM_NAV_HEIGHT_PX}px` }}>
            <RestoreBackupPrompt />
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
