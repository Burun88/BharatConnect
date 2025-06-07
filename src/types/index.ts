
export type UserAura = {
  id: string;
  name: string;
  emoji: string;
  gradient?: string; // For mood-specific gradient ring, e.g., 'bg-gradient-to-r from-yellow-400 to-red-500'
};

export type User = {
  id: string;
  name: string;
  phone?: string;
  avatarUrl?: string; // Placeholder or initials if not available
  currentAuraId?: string | null;
  status?: string; // e.g., "Online", "Last seen...", "Feeling Happy"
  hasViewedStatus?: boolean; // Indicates if the current user has viewed this user's status
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string; // 'currentUser' for outgoing, userId for incoming, 'system' for system messages
  text: string;
  timestamp: number; // Unix timestamp
  status?: 'sent' | 'delivered' | 'read'; // For outgoing messages
  type: 'text' | 'image' | 'system' | 'file'; // To support different message types
  mediaUrl?: string; // URL for image/file
};

export type Chat = {
  id: string;
  type: 'individual' | 'group';
  name: string; // Contact name or group name
  participants: User[]; // For group chats or to store contact info
  lastMessage: Message | null;
  unreadCount: number;
  avatarUrl?: string; // Contact avatar or group avatar
  contactUserId?: string; // For individual chats, the ID of the other user
};

export const AURA_OPTIONS: UserAura[] = [
  { id: 'happy', name: 'Happy', emoji: '😄', gradient: 'bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400' },
  { id: 'sad', name: 'Sad', emoji: '😢', gradient: 'bg-gradient-to-r from-blue-400 to-indigo-500' },
  { id: 'angry', name: 'Angry', emoji: '😠', gradient: 'bg-gradient-to-r from-red-500 to-pink-600' },
  { id: 'calm', name: 'Calm', emoji: '😌', gradient: 'bg-gradient-to-r from-green-300 to-teal-400' },
  { id: 'focused', name: 'Focused', emoji: '🎯', gradient: 'bg-gradient-to-r from-blue-500 to-purple-600' },
  { id: 'romantic', name: 'Romantic', emoji: '🥰', gradient: 'bg-gradient-to-r from-pink-400 to-red-400' },
  { id: 'chill', name: 'Chill', emoji: '😎', gradient: 'bg-gradient-to-r from-cyan-400 to-sky-500' },
  { id: 'playful', name: 'Playful', emoji: '🎉', gradient: 'bg-gradient-to-r from-purple-400 via-pink-500 to-red-500' },
  { id: 'energetic', name: 'Energetic', emoji: '⚡', gradient: 'bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-600' },
];

export type StatusUpdate = {
  id: string;
  userId: string;
  timestamp: number;
  imageUrl?: string; // For image statuses
  text?: string; // For text statuses
  viewedByCurrentUser: boolean; // Has the current logged-in user seen this status?
};
