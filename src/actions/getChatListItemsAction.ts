
'use server';

import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp, limit, getDoc, doc } from 'firebase/firestore';
import type { Chat, Message, User, ParticipantInfo } from '@/types';
import { getUserFullProfile, type BharatConnectFirestoreUser } from '@/services/profileService';
// CRITICAL: Ensure there is NO import for generateChatId from '@/app/chat/[chatId]/page' or similar client components.

// Define generateChatId directly in this file
function generateChatId(uid1: string, uid2: string): string {
  if (!uid1 || !uid2) {
    // console.error("[generateChatId local] Error: One or both UIDs are undefined.", { uid1, uid2 });
    return `error_generating_chat_id_with_undefined_uids_${uid1}_${uid2}`;
  }
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

// Helper function to safely convert Firestore Timestamp to number or return a default
function timestampToMillisSafe(timestamp: any, defaultTimestamp: number = Date.now()): number {
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  if (typeof timestamp === 'number') {
    return timestamp; // Already a millis number
  }
  if (typeof timestamp === 'object' && timestamp && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
    return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toMillis();
  }
  // console.warn(`[timestampToMillisSafe] Received non-Timestamp value: ${JSON.stringify(timestamp)}, using default.`);
  return defaultTimestamp;
}


export interface GetChatListItemsActionResult {
  chats: Chat[];
  diagnostics: string[];
}

export async function getChatListItemsAction(currentUserId: string, currentUserDisplayName: string, currentUserAvatarUrl?: string | null): Promise<GetChatListItemsActionResult> {
  const diagnosticsLog: string[] = [];
  diagnosticsLog.push(`[getChatListItemsAction] Action started for User ID: ${currentUserId}, DisplayName: ${currentUserDisplayName}, Avatar: ${currentUserAvatarUrl || 'N/A'}`);
  diagnosticsLog.push(`[getChatListItemsAction] Using LOCAL generateChatId function.`);

  if (!firestore) {
    diagnosticsLog.push("[getChatListItemsAction CRITICAL_FIRESTORE_UNAVAILABLE] Firestore instance is not available.");
    return { chats: [], diagnostics: diagnosticsLog };
  }
  if (!currentUserId) {
    diagnosticsLog.push("[getChatListItemsAction CRITICAL_USERID_MISSING] currentUserId is missing or undefined.");
    return { chats: [], diagnostics: diagnosticsLog };
  }

  const combinedChatsMap = new Map<string, Chat>();

  // --- Try to fetch user's own profile as an initial diagnostic ---
  try {
    diagnosticsLog.push(`[getChatListItemsAction EXTREME_DIAG] Attempting to getDoc for 'bharatConnectUsers/${currentUserId}'...`);
    const userProfileDocRef = doc(firestore, 'bharatConnectUsers', currentUserId);
    const userProfileSnap = await getDoc(userProfileDocRef);

    if (userProfileSnap.exists()) {
      diagnosticsLog.push(`[getChatListItemsAction EXTREME_DIAG] Successfully fetched own profile. Data: ${JSON.stringify(userProfileSnap.data())}`);
    } else {
      diagnosticsLog.push(`[getChatListItemsAction EXTREME_DIAG] Own profile document 'bharatConnectUsers/${currentUserId}' NOT FOUND.`);
    }
  } catch (profileError: any) {
    diagnosticsLog.push(`[getChatListItemsAction EXTREME_DIAG_ERROR] Error fetching own profile: ${profileError.message || JSON.stringify(profileError)}`);
    if (profileError.code) {
      diagnosticsLog.push(`  [DIAG ERROR_CODE (Profile Fetch)] Firebase Error Code: ${profileError.code}`);
    }
  }
  // --- END EXTREME DIAGNOSTIC ---


  // 1. Fetch Active Chats from the main `chats` collection
  try {
    diagnosticsLog.push("[getChatListItemsAction] Fetching active chats from 'chats' collection...");
    const activeChatsCollectionRef = collection(firestore, 'chats');
    const activeChatsQuery = query(
      activeChatsCollectionRef,
      where('participants', 'array-contains', currentUserId),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    
    diagnosticsLog.push(`[getChatListItemsAction] Query object for active chats created. Attempting getDocs(activeChatsQuery)...`);
    const activeChatsSnapshot = await getDocs(activeChatsQuery);
    diagnosticsLog.push(`[getChatListItemsAction] getDocs(activeChatsQuery) SUCCEEDED for active chats. Found ${activeChatsSnapshot.size} active chat(s).`);

    for (const chatDoc of activeChatsSnapshot.docs) {
      const data = chatDoc.data();
      diagnosticsLog.push(`  [DIAG RAW ACTIVE CHAT DOC] ID: ${chatDoc.id}, Participants: ${JSON.stringify(data.participants)}, Type: ${data.type}, Data: ${JSON.stringify(data)}`);

      const contactId = data.participants?.find((pId: string) => pId !== currentUserId);
      let chatType = data.type || 'individual';
      if (data.participants && data.participants.length === 2 && data.type !== 'group') {
          chatType = 'individual';
      }
      
      if (chatType === 'individual' && !contactId) {
          diagnosticsLog.push(`  [DIAG WARN_ACTIVE_CHAT_SKIP] Chat ${chatDoc.id} is 'individual' but contactId couldn't be determined. Participants: ${JSON.stringify(data.participants)}`);
          continue;
      }

      let contactName = 'Chat User';
      let contactAvatar: string | undefined | null = null;

      if (chatType === 'individual' && contactId) {
        const contactInfoFromDoc = data.participantInfo?.[contactId];
        if (contactInfoFromDoc) {
          contactName = contactInfoFromDoc.name || 'Chat User';
          contactAvatar = contactInfoFromDoc.avatarUrl;
        } else {
          diagnosticsLog.push(`  [DIAG ACTIVE_CHAT_PROFILE_FETCH] ParticipantInfo for ${contactId} not in chat doc ${chatDoc.id}. Fetching full profile.`);
          const profile = await getUserFullProfile(contactId);
          contactName = profile?.originalDisplayName || profile?.displayName || 'Chat User';
          contactAvatar = profile?.photoURL;
        }
      } else if (chatType === 'group') {
        contactName = data.name || 'Group Chat'; 
        contactAvatar = data.avatarUrl; 
      }

      const participantInfoMap: { [uid: string]: ParticipantInfo } = data.participantInfo || {};
      if (!participantInfoMap[currentUserId]) {
        participantInfoMap[currentUserId] = { name: currentUserDisplayName, avatarUrl: currentUserAvatarUrl };
      }
      if (contactId && !participantInfoMap[contactId]) {
         diagnosticsLog.push(`  [DIAG ACTIVE_CHAT_PARTICIPANT_INFO_FILL] ParticipantInfo for ${contactId} missing. Fetching...`);
         const profile = await getUserFullProfile(contactId); 
         participantInfoMap[contactId] = { name: profile?.originalDisplayName || profile?.displayName || 'Chat User', avatarUrl: profile?.photoURL };
      }


      const chatEntry: Chat = {
        id: chatDoc.id,
        type: chatType,
        name: contactName,
        avatarUrl: contactAvatar,
        participants: data.participants || [],
        participantInfo: participantInfoMap,
        lastMessage: data.lastMessage ? {
          text: data.lastMessage.text || '',
          senderId: data.lastMessage.senderId || 'system',
          timestamp: timestampToMillisSafe(data.lastMessage.timestamp),
          type: data.lastMessage.type || 'text',
          readBy: data.lastMessage.readBy || [],
        } : null,
        updatedAt: timestampToMillisSafe(data.updatedAt),
        unreadCount: 0, 
        contactUserId: (chatType === 'individual' && contactId) ? contactId : undefined,
        requestStatus: 'accepted',
        acceptedTimestamp: data.acceptedTimestamp ? timestampToMillisSafe(data.acceptedTimestamp) : undefined,
      };
      combinedChatsMap.set(chatDoc.id, chatEntry);
      diagnosticsLog.push(`  [DIAG PROCESSED_ACTIVE_CHAT] Active chat ${chatDoc.id} processed and added to map.`);
    }
  } catch (error: any) {
    const errorMsg = `[getChatListItemsAction ACTIVE_CHATS_ERROR] Error fetching/processing active chats: ${error.message || JSON.stringify(error)}`;
    console.error(errorMsg, error);
    diagnosticsLog.push(errorMsg);
    if (error.code) {
      diagnosticsLog.push(`  [DIAG ERROR_CODE (Active Chats)] Firebase Error Code: ${error.code}`);
    }
  }


  // 2. Fetch PENDING Sent Requests
  try {
    const requestsSentPath = `bharatConnectUsers/${currentUserId}/requestsSent`;
    diagnosticsLog.push(`[getChatListItemsAction] Fetching PENDING sent requests from '${requestsSentPath}'...`);
    const sentPendingQuery = query(collection(firestore, requestsSentPath), where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const sentPendingSnapshot = await getDocs(sentPendingQuery);
    diagnosticsLog.push(`[getChatListItemsAction] Found ${sentPendingSnapshot.size} PENDING sent request(s).`);

    for (const requestDoc of sentPendingSnapshot.docs) {
      const data = requestDoc.data();
      diagnosticsLog.push(`  [DIAG RAW_SENT_REQ_DOC] ID: ${requestDoc.id}, Data: ${JSON.stringify(data)}`);
      const contactUserId = data.to as string; 
      if (!contactUserId) {
        diagnosticsLog.push(`  [DIAG WARN_SENT_REQ_SKIP] Sent request doc ${requestDoc.id} missing 'to' field. Data: ${JSON.stringify(data)}`);
        continue;
      }
      const requestId = `req_sent_${contactUserId}`; 
      diagnosticsLog.push(`  [DIAG SENT_REQ_PROCESSING] Processing request ID: ${requestId} for contact: ${contactUserId}`);


      const activeChatIdToCheck = generateChatId(currentUserId, contactUserId); // Use local function
      diagnosticsLog.push(`  [DIAG SENT_REQ_CHECK_ACTIVE] Checking for active chat with ID: ${activeChatIdToCheck}`);
      if (combinedChatsMap.has(activeChatIdToCheck)) {
        diagnosticsLog.push(`  [DIAG INFO_SENT_REQ_SKIP] Pending sent request for ${contactUserId} (Request ID: ${requestId}, Active Chat ID: ${activeChatIdToCheck}) ignored as active chat already exists.`);
        continue;
      }
      diagnosticsLog.push(`  [DIAG SENT_REQ_CHECK_DUPLICATE] Checking for duplicate request ID: ${requestId}`);
      if (combinedChatsMap.has(requestId)) {
         diagnosticsLog.push(`  [DIAG INFO_SENT_REQ_DUPLICATE_SKIP] Pending sent request for ${contactUserId} (ID: ${requestId}) already processed from sent requests.`);
         continue;
      }

      diagnosticsLog.push(`  [DIAG SENT_REQ_PROFILE_FETCH] Fetching profile for contact ${contactUserId}.`);
      const contactProfile = await getUserFullProfile(contactUserId);
      const contactName = contactProfile?.originalDisplayName || contactProfile?.displayName || data.name || 'User';
      const contactAvatar = contactProfile?.photoURL || data.photoURL;
      diagnosticsLog.push(`    [DIAG SENT_REQ_PROFILE_RESULT] Contact: ${contactName}, Avatar: ${contactAvatar}`);

      const chatEntry: Chat = {
        id: requestId,
        type: 'individual',
        name: `${contactName}`,
        avatarUrl: contactAvatar,
        participants: [currentUserId, contactUserId],
        participantInfo: {
          [currentUserId]: { name: currentUserDisplayName, avatarUrl: currentUserAvatarUrl },
          [contactUserId]: { name: contactName, avatarUrl: contactAvatar },
        },
        lastMessage: {
            text: data.firstMessageTextPreview || "Request sent. Waiting for approval...",
            senderId: currentUserId,
            timestamp: timestampToMillisSafe(data.timestamp),
            type: 'text',
            readBy: [currentUserId],
        },
        updatedAt: timestampToMillisSafe(data.timestamp),
        unreadCount: 0,
        contactUserId: contactUserId,
        requestStatus: 'pending',
        requesterId: currentUserId,
        firstMessageTextPreview: data.firstMessageTextPreview || "Request sent. Waiting for approval...",
      };
      combinedChatsMap.set(requestId, chatEntry);
      diagnosticsLog.push(`  [DIAG PROCESSED_SENT_REQ] Pending sent request to ${contactName} (ID: ${requestId}) added to map. Map size: ${combinedChatsMap.size}`);
    }
  } catch (error: any) {
    const errorMsg = `[getChatListItemsAction SENT_REQUESTS_ERROR] Error fetching/processing sent requests: ${error.message || JSON.stringify(error)}`;
    console.error(errorMsg, error);
    diagnosticsLog.push(errorMsg);
    if (error.code) {
      diagnosticsLog.push(`  [DIAG ERROR_CODE (Sent Requests)] Firebase Error Code: ${error.code}`);
    }
  }

  // 3. Fetch PENDING Received Requests
  try {
    const requestsReceivedPath = `bharatConnectUsers/${currentUserId}/requestsReceived`;
    diagnosticsLog.push(`[getChatListItemsAction] Fetching PENDING received requests from '${requestsReceivedPath}'...`);
    const receivedPendingQuery = query(collection(firestore, requestsReceivedPath), where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const receivedPendingSnapshot = await getDocs(receivedPendingQuery);
    diagnosticsLog.push(`[getChatListItemsAction] Found ${receivedPendingSnapshot.size} PENDING received request(s).`);

    for (const requestDoc of receivedPendingSnapshot.docs) {
      const data = requestDoc.data();
      diagnosticsLog.push(`  [DIAG RAW_RECEIVED_REQ_DOC] ID: ${requestDoc.id}, Data: ${JSON.stringify(data)}`);
      const contactUserId = data.from as string; 
      if (!contactUserId) {
        diagnosticsLog.push(`  [DIAG WARN_RECEIVED_REQ_SKIP] Received request doc ${requestDoc.id} missing 'from' field. Data: ${JSON.stringify(data)}`);
        continue;
      }
      const requestId = `req_rec_${contactUserId}`;
      diagnosticsLog.push(`  [DIAG RECEIVED_REQ_PROCESSING] Processing request ID: ${requestId} for contact: ${contactUserId}`);

      const activeChatIdToCheck = generateChatId(currentUserId, contactUserId); // Use local function
      diagnosticsLog.push(`  [DIAG RECEIVED_REQ_CHECK_ACTIVE] Checking for active chat with ID: ${activeChatIdToCheck}`);
      if (combinedChatsMap.has(activeChatIdToCheck)) {
        diagnosticsLog.push(`  [DIAG INFO_RECEIVED_REQ_SKIP] Pending received request for ${contactUserId} (Request ID: ${requestId}, Active Chat ID: ${activeChatIdToCheck}) ignored as active chat already exists.`);
        continue;
      }
      diagnosticsLog.push(`  [DIAG RECEIVED_REQ_CHECK_DUPLICATE] Checking for duplicate request ID: ${requestId}`);
       if (combinedChatsMap.has(requestId)) {
         diagnosticsLog.push(`  [DIAG INFO_RECEIVED_REQ_DUPLICATE_SKIP] Pending received request from ${contactUserId} (ID: ${requestId}) already processed from received requests.`);
         continue;
      }
      
      diagnosticsLog.push(`  [DIAG RECEIVED_REQ_PROFILE_FETCH] Fetching profile for contact ${contactUserId}.`);
      const contactProfile = await getUserFullProfile(contactUserId);
      const contactName = contactProfile?.originalDisplayName || contactProfile?.displayName || data.name || 'User';
      const contactAvatar = contactProfile?.photoURL || data.photoURL;
      diagnosticsLog.push(`    [DIAG RECEIVED_REQ_PROFILE_RESULT] Contact: ${contactName}, Avatar: ${contactAvatar}`);

      const chatEntry: Chat = {
        id: requestId,
        type: 'individual',
        name: `${contactName}`,
        avatarUrl: contactAvatar,
        participants: [currentUserId, contactUserId],
        participantInfo: {
          [currentUserId]: { name: currentUserDisplayName, avatarUrl: currentUserAvatarUrl },
          [contactUserId]: { name: contactName, avatarUrl: contactAvatar },
        },
        lastMessage: {
          text: data.firstMessageTextPreview || "Wants to connect with you.",
          senderId: contactUserId,
          timestamp: timestampToMillisSafe(data.timestamp),
          type: 'text',
          readBy: [contactUserId], 
        },
        updatedAt: timestampToMillisSafe(data.timestamp),
        unreadCount: 1, 
        contactUserId: contactUserId,
        requestStatus: 'awaiting_action',
        requesterId: contactUserId,
        firstMessageTextPreview: data.firstMessageTextPreview || "Wants to connect with you.",
      };
      combinedChatsMap.set(requestId, chatEntry);
      diagnosticsLog.push(`  [DIAG PROCESSED_RECEIVED_REQ] Pending received request from ${contactName} (ID: ${requestId}) added to map. Map size: ${combinedChatsMap.size}`);
    }
  } catch (error: any) {
    const errorMsg = `[getChatListItemsAction RECEIVED_REQUESTS_ERROR] Error fetching/processing received requests: ${error.message || JSON.stringify(error)}`;
    console.error(errorMsg, error);
    diagnosticsLog.push(errorMsg);
    if (error.code) {
      diagnosticsLog.push(`  [DIAG ERROR_CODE (Received Requests)] Firebase Error Code: ${error.code}`);
    }
  }

  const finalChatsArray = Array.from(combinedChatsMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  diagnosticsLog.push(`[getChatListItemsAction] Finished processing. Total chats from map: ${finalChatsArray.length}. Returning for UI.`);
  return { chats: finalChatsArray, diagnostics: diagnosticsLog };
}
    
