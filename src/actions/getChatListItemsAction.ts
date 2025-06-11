
'use server';

import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { Chat, Message, User } from '@/types';

// Helper function to safely convert Firestore Timestamp to number
function timestampToMillis(timestamp: Timestamp | undefined | null): number {
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  return Date.now(); // Fallback to current time if undefined or null
}

export interface GetChatListItemsActionResult {
  chats: Chat[];
  diagnostics: string[];
}

export async function getChatListItemsAction(currentUserId: string, currentUserDisplayName: string, currentUserAvatarUrl?: string | null): Promise<GetChatListItemsActionResult> {
  const diagnosticsLog: string[] = [];
  diagnosticsLog.push("[getChatListItemsAction] Action started.");

  if (!firestore) {
    const errorMsg = "[getChatListItemsAction] Firestore instance is not available.";
    console.error(errorMsg);
    diagnosticsLog.push(errorMsg);
    return { chats: [], diagnostics: diagnosticsLog };
  }
  if (!currentUserId) {
    const errorMsg = "[getChatListItemsAction] currentUserId is required.";
    console.error(errorMsg);
    diagnosticsLog.push(errorMsg);
    return { chats: [], diagnostics: diagnosticsLog };
  }
  diagnosticsLog.push(`[getChatListItemsAction] Current User ID: ${currentUserId}, DisplayName: ${currentUserDisplayName}`);

  const fetchedChats: Chat[] = [];

  try {
    // 1. Fetch Sent Requests
    diagnosticsLog.push("[getChatListItemsAction] Fetching sent requests...");
    const requestsSentRef = collection(firestore, `bharatConnectUsers/${currentUserId}/requestsSent`);
    const sentQuery = query(requestsSentRef, where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const sentSnapshot = await getDocs(sentQuery);
    diagnosticsLog.push(`[getChatListItemsAction] Found ${sentSnapshot.size} sent request(s).`);

    sentSnapshot.forEach(doc => {
      const data = doc.data();
      diagnosticsLog.push(`[getChatListItemsAction] Processing sent request doc ID: ${doc.id}, Data: ${JSON.stringify(data)}`);
      const requestTimestamp = timestampToMillis(data.timestamp);
      
      fetchedChats.push({
        id: `req_sent_${data.to || doc.id}`,
        type: 'individual',
        name: data.name || 'Unknown User',
        contactUserId: data.to,
        participants: [
          { id: currentUserId, name: currentUserDisplayName || 'You', avatarUrl: currentUserAvatarUrl || undefined },
          { id: data.to, name: data.name || 'Unknown User', avatarUrl: data.photoURL || undefined }
        ],
        lastMessage: {
          id: `lmsg_sent_${data.to || doc.id}`,
          chatId: `req_sent_${data.to || doc.id}`,
          senderId: currentUserId,
          text: "Request sent. Waiting for approval...",
          timestamp: requestTimestamp,
          type: 'text',
          status: 'sent'
        },
        unreadCount: 0,
        avatarUrl: data.photoURL || undefined,
        requestStatus: 'pending',
        requesterId: currentUserId,
        firstMessageTextPreview: "Request sent. Waiting for approval...",
      });
    });

    // 2. Fetch Received Requests
    diagnosticsLog.push("[getChatListItemsAction] Fetching received requests...");
    const requestsReceivedRef = collection(firestore, `bharatConnectUsers/${currentUserId}/requestsReceived`);
    const receivedQuery = query(requestsReceivedRef, where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const receivedSnapshot = await getDocs(receivedQuery);
    diagnosticsLog.push(`[getChatListItemsAction] Found ${receivedSnapshot.size} received request(s).`);

    receivedSnapshot.forEach(doc => {
      const data = doc.data();
      diagnosticsLog.push(`[getChatListItemsAction] Processing received request doc ID: ${doc.id}, Data: ${JSON.stringify(data)}`);
      const requestTimestamp = timestampToMillis(data.timestamp);

      fetchedChats.push({
        id: `req_rec_${data.from || doc.id}`,
        type: 'individual',
        name: `${data.name || 'Unknown User'} (Wants to Connect)`,
        contactUserId: data.from,
        participants: [
          { id: currentUserId, name: currentUserDisplayName || 'You', avatarUrl: currentUserAvatarUrl || undefined },
          { id: data.from, name: data.name || 'Unknown User', avatarUrl: data.photoURL || undefined }
        ],
        lastMessage: {
          id: `lmsg_rec_${data.from || doc.id}`,
          chatId: `req_rec_${data.from || doc.id}`,
          senderId: data.from,
          text: "Wants to connect with you.",
          timestamp: requestTimestamp,
          type: 'text',
        },
        unreadCount: 1,
        avatarUrl: data.photoURL || undefined,
        requestStatus: 'awaiting_action',
        requesterId: data.from,
        firstMessageTextPreview: "Wants to connect with you. Tap to respond.",
      });
    });

  } catch (error: any) {
    const errorMsg = `[getChatListItemsAction] Error fetching chat requests: ${error.message || JSON.stringify(error)}`;
    console.error(errorMsg, error);
    diagnosticsLog.push(errorMsg);
  }
  
  diagnosticsLog.push(`[getChatListItemsAction] Finished processing. Total fetchedChats to be returned (before client-side sort): ${fetchedChats.length}`);
  return { chats: fetchedChats, diagnostics: diagnosticsLog };
}
