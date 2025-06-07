
import type { User, Chat, Message, UserAura } from '@/types';
import { AURA_OPTIONS } from '@/types';

export const mockCurrentUser: User = {
  id: 'currentUser',
  name: 'You',
  avatarUrl: 'https://placehold.co/100x100.png', // Generic placeholder
  currentAuraId: null,
};

export const mockUsers: User[] = [
  mockCurrentUser,
  {
    id: 'user1',
    name: 'Priya Sharma',
    avatarUrl: 'https://placehold.co/100x100/E8A0BF/4A2E39.png', // Placeholder with color scheme
    currentAuraId: 'happy',
    status: 'Online',
  },
  {
    id: 'user2',
    name: 'Rahul Kumar',
    avatarUrl: 'https://placehold.co/100x100/A0E8BF/2E4A39.png', // Placeholder with color scheme
    currentAuraId: 'focused',
    status: 'Last seen yesterday at 10:30 PM',
  },
  {
    id: 'user3',
    name: 'Anjali Singh',
    avatarUrl: 'https://placehold.co/100x100/BFA0E8/392E4A.png', // Placeholder with color scheme
    currentAuraId: null,
    status: 'Typing...',
  },
  {
    id: 'user4',
    name: 'Vikram Patel',
    avatarUrl: 'https://placehold.co/100x100/E8BFA0/4A392E.png', // Placeholder with color scheme
    currentAuraId: 'chill',
    status: 'Feeling Chill 😎',
  },
];

const getAuraById = (id: string | null | undefined): UserAura | undefined => AURA_OPTIONS.find(a => a.id === id);

export const mockMessagesData: { [chatId: string]: Message[] } = {
  chat1: [
    { id: 'msg1_1', chatId: 'chat1', senderId: 'user1', text: 'Hey there! How are you?', timestamp: Date.now() - 1000 * 60 * 60 * 2, type: 'text' },
    { id: 'msg1_2', chatId: 'chat1', senderId: 'currentUser', text: 'Hi Priya! I am good, thanks for asking. You?', timestamp: Date.now() - 1000 * 60 * 58, type: 'text', status: 'read' },
    { id: 'msg1_3', chatId: 'chat1', senderId: 'user1', text: 'Doing great! Just working on some stuff.', timestamp: Date.now() - 1000 * 60 * 55, type: 'text' },
    { id: 'msg1_4', chatId: 'chat1', senderId: 'system', text: 'Priya is now Feeling Happy 😄', timestamp: Date.now() - 1000 * 60 * 50, type: 'system' },
  ],
  chat2: [
    { id: 'msg2_1', chatId: 'chat2', senderId: 'user2', text: 'Can you send me the report?', timestamp: Date.now() - 1000 * 60 * 30, type: 'text' },
    { id: 'msg2_2', chatId: 'chat2', senderId: 'currentUser', text: 'Sure, let me find it.', timestamp: Date.now() - 1000 * 60 * 28, type: 'text', status: 'delivered' },
  ],
  chat3: [
    { id: 'msg3_1', chatId: 'chat3', senderId: 'user3', text: 'Lunch today?', timestamp: Date.now() - 1000 * 60 * 5, type: 'text' },
  ],
   chat4: [
    { id: 'msg4_1', chatId: 'chat4', senderId: 'user4', text: 'Just chilling, wbu?', timestamp: Date.now() - 1000 * 60 * 120, type: 'text' },
    { id: 'msg4_2', chatId: 'chat4', senderId: 'currentUser', text: 'Same here, enjoying the weekend!', timestamp: Date.now() - 1000 * 60 * 115, type: 'text', status: 'sent' },
  ],
};

export const mockChats: Chat[] = [
  {
    id: 'chat1',
    type: 'individual',
    name: 'Priya Sharma',
    contactUserId: 'user1',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user1')!],
    lastMessage: mockMessagesData.chat1[mockMessagesData.chat1.length -1],
    unreadCount: 2,
    avatarUrl: mockUsers.find(u => u.id === 'user1')?.avatarUrl,
  },
  {
    id: 'chat2',
    type: 'individual',
    name: 'Rahul Kumar',
    contactUserId: 'user2',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user2')!],
    lastMessage: mockMessagesData.chat2[mockMessagesData.chat2.length - 1],
    unreadCount: 0,
    avatarUrl: mockUsers.find(u => u.id === 'user2')?.avatarUrl,
  },
  {
    id: 'chat3',
    type: 'individual',
    name: 'Anjali Singh',
    contactUserId: 'user3',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user3')!],
    lastMessage: mockMessagesData.chat3[mockMessagesData.chat3.length - 1],
    unreadCount: 1,
    avatarUrl: mockUsers.find(u => u.id === 'user3')?.avatarUrl,
  },
  {
    id: 'chat4',
    type: 'individual',
    name: 'Vikram Patel',
    contactUserId: 'user4',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user4')!],
    lastMessage: mockMessagesData.chat4[mockMessagesData.chat4.length - 1],
    unreadCount: 0,
    avatarUrl: mockUsers.find(u => u.id === 'user4')?.avatarUrl,
  },
];


export const mockAuraBarItemsData = (): User[] => {
  // Ensure consistent avatarUrl from mockUsers
  const usersWithAura = mockUsers.map(user => {
    const baseUser = mockUsers.find(u => u.id === user.id) || user; // Get the user with potentially updated avatar
    const aura = getAuraById(baseUser.currentAuraId);
    return {
      ...baseUser,
      status: aura ? `Feeling ${aura.name} ${aura.emoji}` : baseUser.status || 'Offline',
    };
  });
  return usersWithAura;
};

