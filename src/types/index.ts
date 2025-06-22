import type { ReactNode } from 'react';
import React from 'react';

// Using React.createElement to define an SVG component within a .ts file
const SadAuraIcon = React.createElement('svg',
    {
        viewBox: "0 0 64 64",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        width: "1em",
        height: "1em",
    },
    React.createElement('circle', { cx: "32", cy: "32", r: "28", stroke: "currentColor", strokeWidth: "3" }),
    React.createElement('ellipse', { cx: "24", cy: "28", rx: "3", ry: "7", fill: "currentColor" }),
    React.createElement('ellipse', { cx: "40", cy: "28", rx: "3", ry: "7", fill: "currentColor" }),
    React.createElement('path', { d: "M20 46 C 26 38, 38 38, 44 46", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round" }),
    React.createElement('path', { d: "M20 46 L 24 44", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round" }),
    React.createElement('path', { d: "M44 46 L 40 44", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round" })
);


export type UserAura = {
  id: string; // e.g., 'happy', 'sad'
  name: string;
  emoji: ReactNode;
  gradient?: string; // Tailwind gradient class string
};

export type User = {
  id: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string | null;
  status?: string;
  hasViewedStatus?: boolean;
  onboardingComplete?: boolean;
  bio?: string | null;
  publicKey?: string; // For E2EE
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text?: string; // Decrypted text, now optional
  timestamp: number;
  type: 'text' | 'image' | 'system' | 'file';
  mediaUrl?: string;
  readBy?: string[];
  clientTempId?: string;
  firestoreId?: string;
  // E2EE fields
  encryptedText?: string;
  iv?: string;
  encryptedKeys?: { [uid: string]: string };
  error?: 'DECRYPTION_FAILED';
};

export type ChatRequestStatus = 'pending' | 'awaiting_action' | 'accepted' | 'rejected' | 'none';

export type ParticipantInfo = {
  name: string;
  avatarUrl?: string | null;
  currentAuraId?: string | null;
  hasActiveUnviewedStatus?: boolean; // New: Indicates active, unviewed status by current user
  hasActiveViewedStatus?: boolean;   // New: Indicates active, viewed status by current user
};

export type ChatSpecificPresence = {
  state: 'online' | 'offline';
  lastChanged: any; // Firestore Timestamp
};

export type Chat = {
  id: string;
  type: 'individual' | 'group';
  name: string;
  participants: string[];
  participantInfo?: { [uid: string]: ParticipantInfo };
  lastMessage: {
    text?: string; // Decrypted text, optional
    senderId: string;
    timestamp: number;
    type: 'text' | 'image' | 'system' | 'file';
    readBy?: string[];
    // E2EE fields
    encryptedText?: string;
    iv?: string;
    encryptedKeys?: { [uid: string]: string };
  } | null;
  updatedAt: number;
  unreadCount: number;
  contactUserId?: string;
  requestStatus?: ChatRequestStatus;
  requesterId?: string | null;
  firstMessageTextPreview?: string | null;
  acceptedTimestamp?: number;
  typingStatus?: { [uid: string]: boolean };
  chatSpecificPresence?: { [uid: string]: ChatSpecificPresence };
};

export const AURA_OPTIONS: UserAura[] = [
  { id: 'happy', name: 'Happy', emoji: '😄', gradient: 'bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400' },
  { id: 'sad', name: 'Sad', emoji: SadAuraIcon, gradient: 'bg-gradient-to-r from-blue-400 to-indigo-500' },
  { id: 'angry', name: 'Angry', emoji: '😠', gradient: 'bg-gradient-to-r from-red-500 to-pink-600' },
  { id: 'calm', name: 'Calm', emoji: '😌', gradient: 'bg-gradient-to-r from-green-300 to-teal-400' },
  { id: 'focused', name: 'Focused', emoji: '🎯', gradient: 'bg-gradient-to-r from-blue-500 to-purple-600' },
  { id: 'romantic', name: 'Romantic', emoji: '🥰', gradient: 'bg-gradient-to-r from-pink-400 to-red-400' },
  { id: 'chill', name: 'Chill', emoji: '😎', gradient: 'bg-gradient-to-r from-cyan-400 to-sky-500' },
  { id: 'playful', name: 'Playful', emoji: '🎉', gradient: 'bg-gradient-to-r from-purple-400 via-pink-500 to-red-500' },
  { id: 'energetic', name: 'Energetic', emoji: '⚡', gradient: 'bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-600' },
];

// Existing StatusUpdate type - might be revised later when displaying individual status items
export type StatusUpdate = {
  id: string;
  userId: string;
  timestamp: number;
  imageUrl?: string;
  text?: string;
  viewedByCurrentUser: boolean;
};

// New types for the Firestore status feature
export type StatusMediaType = 'image' | 'video' | 'text';

export interface StatusMediaItem {
  id: string; // Unique ID for this media item (can be generated on client or server)
  url?: string; // For image/video from Firebase Storage
  type: StatusMediaType;
  createdAt: any; // Firestore Timestamp
  textContent?: string; // For text statuses
  duration?: number; // Optional: duration in seconds for video/image display
}

export interface UserStatusDoc {
  // Document ID in 'status' collection will be the userId
  userId: string;
  createdAt: any; // Firestore Timestamp (when the first status in this batch was created)
  expiresAt: any; // Firestore Timestamp (when this batch of statuses expires)
  media: StatusMediaItem[]; // Array of individual status media items
  viewers?: string[]; // Array of user IDs who viewed this status
  isActive?: boolean; // Whether this status document is currently active (expiresAt > now)
  auraColor?: string; // Optional: if status ring is linked to user's aura
  lastMediaTimestamp?: any; // Firestore Timestamp of the latest media item in the 'media' array
}


export interface LocalUserProfile {
  uid: string;
  email: string;
  username?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  bio?: string | null;
  onboardingComplete: boolean;
}

export interface FirestoreAura {
  userId: string;
  auraOptionId: string;
  createdAt: any; // Firestore Timestamp
}

export interface DisplayAura {
  id: string;
  userId: string;
  auraOptionId: string;
  createdAt: number;
  userName: string;
  userProfileAvatarUrl?: string | null;
  auraStyle: UserAura | null;
}

// Types for WebRTC Calling
export type CallStatus = 'ringing' | 'connected' | 'declined' | 'ended' | 'error' | 'missed';
export type CallType = 'audio' | 'video';

export interface CallDocument {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatarUrl?: string | null;
  calleeId: string;
  calleeName: string;
  calleeAvatarUrl?: string | null;
  status: CallStatus;
  callType: CallType;
  offer?: {
    sdp: string;
    type: 'offer';
  };
  answer?: {
    sdp: string;
    type: 'answer';
  };
  createdAt: any; // Firestore Timestamp
  endedAt?: any; // Firestore Timestamp
}
