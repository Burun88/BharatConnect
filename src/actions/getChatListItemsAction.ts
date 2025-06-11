
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

export async function getChatListItemsAction(currentUserId: string, currentUserDisplayName: string, currentUserAvatarUrl?: string | null): Promise<Chat[]> {
  if (!firestore) {
    console.error("[getChatListItemsAction] Firestore instance is not available.");
    return [];
  }
  if (!currentUserId) {
    console.error("[getChatListItemsAction] currentUserId is required.");
    return [];
  }

  const fetchedChats: Chat[] = [];

  try {
    // 1. Fetch Sent Requests
    const requestsSentRef = collection(firestore, `bharatConnectUsers/${currentUserId}/requestsSent`);
    const sentQuery = query(requestsSentRef, where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const sentSnapshot = await getDocs(sentQuery);

    sentSnapshot.forEach(doc => {
      const data = doc.data();
      const requestTimestamp = timestampToMillis(data.timestamp);
      
      fetchedChats.push({
        id: `req_sent_${data.to || doc.id}`, // Use 'to' field as part of ID
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
          status: 'sent' // Or a specific status if tracked for requests
        },
        unreadCount: 0,
        avatarUrl: data.photoURL || undefined,
        requestStatus: 'pending',
        requesterId: currentUserId,
        firstMessageTextPreview: "Request sent. Waiting for approval...",
      });
    });

    // 2. Fetch Received Requests
    const requestsReceivedRef = collection(firestore, `bharatConnectUsers/${currentUserId}/requestsReceived`);
    const receivedQuery = query(requestsReceivedRef, where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const receivedSnapshot = await getDocs(receivedQuery);

    receivedSnapshot.forEach(doc => {
      const data = doc.data();
      const requestTimestamp = timestampToMillis(data.timestamp);

      fetchedChats.push({
        id: `req_rec_${data.from || doc.id}`, // Use 'from' field as part of ID
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
          // For now, use a generic preview. In a real app, this initial message should be stored.
          text: "Wants to connect with you.",
          timestamp: requestTimestamp,
          type: 'text',
        },
        unreadCount: 1, // Assume new requests are unread
        avatarUrl: data.photoURL || undefined,
        requestStatus: 'awaiting_action',
        requesterId: data.from,
        firstMessageTextPreview: "Wants to connect with you. Tap to respond.",
      });
    });

  } catch (error) {
    console.error("[getChatListItemsAction] Error fetching chat requests:", error);
    // Return empty or partial list, or rethrow, depending on desired error handling
  }
  
  console.log(`[getChatListItemsAction] Fetched ${fetchedChats.length} live requests for user ${currentUserId}`);
  return fetchedChats;
}
