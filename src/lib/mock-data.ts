
import type { User, Chat, Message, UserAura } from '@/types';
import { AURA_OPTIONS } from '@/types';

export const mockCurrentUser: User = {
  id: 'currentUser',
  name: 'You',
  avatarUrl: 'https://picsum.photos/seed/currentUser/100/100', 
  currentAuraId: null,
};

export const mockUsers: User[] = [
  mockCurrentUser,
  {
    id: 'user1',
    name: 'Priya Sharma',
    avatarUrl: 'https://picsum.photos/seed/user1/100/100', 
    currentAuraId: 'happy',
    status: 'Online',
  },
  {
    id: 'user2',
    name: 'Rahul Kumar',
    avatarUrl: 'https://picsum.photos/seed/user2/100/100', 
    currentAuraId: 'focused',
    status: 'Last seen yesterday at 10:30 PM',
  },
  {
    id: 'user3',
    name: 'Anjali Singh',
    avatarUrl: 'https://picsum.photos/seed/user3/100/100', 
    currentAuraId: null,
    status: 'Typing...',
  },
  {
    id: 'user4',
    name: 'Vikram Patel',
    avatarUrl: 'https://picsum.photos/seed/user4/100/100', 
    currentAuraId: 'chill',
    status: 'Feeling Chill 😎',
  },
  {
    id: 'user5',
    name: 'Deepika Iyer',
    avatarUrl: 'https://picsum.photos/seed/user5/100/100',
    currentAuraId: 'energetic',
    status: 'Ready to go!',
  },
  {
    id: 'user6',
    name: 'Arjun Reddy',
    avatarUrl: 'https://picsum.photos/seed/user6/100/100',
    currentAuraId: null, 
    status: 'Away',
  },
  {
    id: 'user7',
    name: 'Sneha Kapoor',
    avatarUrl: 'https://picsum.photos/seed/user7/100/100',
    currentAuraId: 'playful',
    status: 'Feeling playful! 🎉',
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
  chat5: [
    { id: 'msg5_1', chatId: 'chat5', senderId: 'user5', text: 'Morning! Coffee?', timestamp: Date.now() - 1000 * 60 * 60 * 3, type: 'text' },
    { id: 'msg5_2', chatId: 'chat5', senderId: 'currentUser', text: 'Good morning! Sounds great.', timestamp: Date.now() - 1000 * 60 * 50, type: 'text', status: 'read' },
  ],
  chat6: [
    { id: 'msg6_1', chatId: 'chat6', senderId: 'user6', text: 'Project update?', timestamp: Date.now() - 1000 * 60 * 40, type: 'text' },
  ],
  chat7: [
    { id: 'msg7_1', chatId: 'chat7', senderId: 'user7', text: 'Party tonight! You in?', timestamp: Date.now() - 1000 * 60 * 15, type: 'text' },
    { id: 'msg7_2', chatId: 'chat7', senderId: 'currentUser', text: 'Definitely! What time?', timestamp: Date.now() - 1000 * 60 * 10, type: 'text', status: 'sent'},
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
  {
    id: 'chat5',
    type: 'individual',
    name: 'Deepika Iyer',
    contactUserId: 'user5',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user5')!], // Ensure user5 exists in mockUsers
    lastMessage: mockMessagesData.chat5[mockMessagesData.chat5.length -1],
    unreadCount: 0,
    avatarUrl: mockUsers.find(u => u.id === 'user5')?.avatarUrl,
  },
  {
    id: 'chat6',
    type: 'individual',
    name: 'Arjun Reddy',
    contactUserId: 'user6',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user6')!], // Ensure user6 exists
    lastMessage: mockMessagesData.chat6[mockMessagesData.chat6.length - 1],
    unreadCount: 1,
    avatarUrl: mockUsers.find(u => u.id === 'user6')?.avatarUrl,
  },
  {
    id: 'chat7',
    type: 'individual',
    name: 'Sneha Kapoor',
    contactUserId: 'user7',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user7')!], // Ensure user7 exists
    lastMessage: mockMessagesData.chat7[mockMessagesData.chat7.length - 1],
    unreadCount: 3,
    avatarUrl: mockUsers.find(u => u.id === 'user7')?.avatarUrl,
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
