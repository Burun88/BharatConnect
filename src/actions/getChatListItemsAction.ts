
'use server';

import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { Chat, Message, User } from '@/types';

// Helper function to safely convert Firestore Timestamp to number
function timestampToMillis(timestamp: Timestamp | undefined | null): number {
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  // Fallback to current time if undefined or null, or if it's already a number
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  return Date.now(); 
}

export interface GetChatListItemsActionResult {
  chats: Chat[];
  diagnostics: string[];
}

export async function getChatListItemsAction(currentUserId: string, currentUserDisplayName: string, currentUserAvatarUrl?: string | null): Promise<GetChatListItemsActionResult> {
  const diagnosticsLog: string[] = [];
  diagnosticsLog.push("[getChatListItemsAction] Action started.");

  if (!firestore) {
    const errorMsg = "[getChatListItemsAction CRITICAL] Firestore instance is not available. Action will fail.";
    console.error(errorMsg);
    diagnosticsLog.push(errorMsg);
    return { chats: [], diagnostics: diagnosticsLog };
  }
  diagnosticsLog.push("[getChatListItemsAction] Firestore instance appears to be initialized.");

  if (!currentUserId) {
    const errorMsg = "[getChatListItemsAction CRITICAL] currentUserId is required.";
    console.error(errorMsg);
    diagnosticsLog.push(errorMsg);
    return { chats: [], diagnostics: diagnosticsLog };
  }
  diagnosticsLog.push(`[getChatListItemsAction] Current User ID: ${currentUserId}, DisplayName: ${currentUserDisplayName}, Avatar: ${currentUserAvatarUrl || 'N/A'}`);

  const fetchedChats: Chat[] = [];

  try {
    // 1. Fetch Sent Requests
    diagnosticsLog.push("[getChatListItemsAction] Fetching sent requests...");
    const requestsSentPath = `bharatConnectUsers/${currentUserId}/requestsSent`;
    diagnosticsLog.push(`[getChatListItemsAction] Querying path: ${requestsSentPath} for status 'pending', orderBy 'timestamp' desc.`);
    const requestsSentRef = collection(firestore, requestsSentPath);
    const sentQuery = query(requestsSentRef, where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const sentSnapshot = await getDocs(sentQuery);
    diagnosticsLog.push(`[getChatListItemsAction] Found ${sentSnapshot.size} sent request(s).`);

    sentSnapshot.forEach(doc => {
      const data = doc.data();
      diagnosticsLog.push(`[getChatListItemsAction] Processing sent request doc ID: ${doc.id}, Data: ${JSON.stringify(data)}`);
      const requestTimestamp = timestampToMillis(data.timestamp);
      
      fetchedChats.push({
        id: `req_sent_${data.to || doc.id}`, // Use 'to' field from data if available, else doc.id
        type: 'individual',
        name: data.name || 'Unknown User', // Name of the recipient
        contactUserId: data.to, // UID of the recipient
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
        avatarUrl: data.photoURL || undefined, // Avatar of the recipient
        requestStatus: 'pending',
        requesterId: currentUserId,
        firstMessageTextPreview: "Request sent. Waiting for approval...",
      });
    });

    // 2. Fetch Received Requests
    diagnosticsLog.push("[getChatListItemsAction] Fetching received requests...");
    const requestsReceivedPath = `bharatConnectUsers/${currentUserId}/requestsReceived`;
    diagnosticsLog.push(`[getChatListItemsAction] Querying path: ${requestsReceivedPath} for status 'pending', orderBy 'timestamp' desc.`);
    const requestsReceivedRef = collection(firestore, requestsReceivedPath);
    const receivedQuery = query(requestsReceivedRef, where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const receivedSnapshot = await getDocs(receivedQuery);
    diagnosticsLog.push(`[getChatListItemsAction] Found ${receivedSnapshot.size} received request(s).`);

    receivedSnapshot.forEach(doc => {
      const data = doc.data();
      diagnosticsLog.push(`[getChatListItemsAction] Processing received request doc ID: ${doc.id}, Data: ${JSON.stringify(data)}`);
      const requestTimestamp = timestampToMillis(data.timestamp);

      // For received requests, the document ID is the sender's UID
      // The 'from' field in data should also be the sender's UID
      const senderId = data.from || doc.id; 

      fetchedChats.push({
        id: `req_rec_${senderId}`, // Use senderId for unique chat ID
        type: 'individual',
        name: `${data.name || 'Unknown User'} (Wants to Connect)`, // Name of the sender
        contactUserId: senderId, // UID of the sender
        participants: [
          { id: currentUserId, name: currentUserDisplayName || 'You', avatarUrl: currentUserAvatarUrl || undefined },
          { id: senderId, name: data.name || 'Unknown User', avatarUrl: data.photoURL || undefined }
        ],
        lastMessage: {
          id: `lmsg_rec_${senderId}`,
          chatId: `req_rec_${senderId}`,
          senderId: senderId, // Message is from the sender
          text: "Wants to connect with you.", // Generic message for received request
          timestamp: requestTimestamp,
          type: 'text',
        },
        unreadCount: 1, // Typically a new request is unread
        avatarUrl: data.photoURL || undefined, // Avatar of the sender
        requestStatus: 'awaiting_action',
        requesterId: senderId, // Requester is the sender
        firstMessageTextPreview: data.firstMessageTextPreview || "Wants to connect with you. Tap to respond.",
      });
    });

  } catch (error: any) {
    const errorMsg = `[getChatListItemsAction] Error during Firestore query or processing: ${error.message || JSON.stringify(error)}`;
    console.error(errorMsg, error);
    diagnosticsLog.push(errorMsg);
    if (error.stack) {
      diagnosticsLog.push(`[getChatListItemsAction] Error Stack: ${error.stack}`);
    }
  }
  
  diagnosticsLog.push(`[getChatListItemsAction] Finished processing. Total fetchedChats to be returned (before client-side sort): ${fetchedChats.length}`);
  if (fetchedChats.length > 0) {
    diagnosticsLog.push(`[getChatListItemsAction] Sample of fetchedChats (first item if any): ${JSON.stringify(fetchedChats[0])}`);
  }
  return { chats: fetchedChats, diagnostics: diagnosticsLog };
}
