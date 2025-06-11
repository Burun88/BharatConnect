
import type { User, Chat, Message, UserAura, StatusUpdate } from '@/types';
import { AURA_OPTIONS } from '@/types';

export const mockCurrentUser: User = {
  id: 'currentUser',
  name: 'You',
  username: 'currentuser',
  avatarUrl: undefined, // Ensures AvatarFallback is used
  currentAuraId: null,
  hasViewedStatus: true, 
};

export const mockUsers: User[] = [
  {
    id: 'user1',
    name: 'Priya Sharma',
    username: 'priyasharma',
    avatarUrl: 'https://picsum.photos/seed/user1/100/100',
    currentAuraId: 'happy',
    status: 'Online',
    hasViewedStatus: false,
  },
  {
    id: 'user2',
    name: 'Rahul Kumar',
    username: 'rahulkumar',
    avatarUrl: 'https://picsum.photos/seed/user2/100/100', 
    currentAuraId: 'focused',
    status: 'Last seen yesterday at 10:30 PM',
    hasViewedStatus: true,
  },
  {
    id: 'user3',
    name: 'Anjali Singh',
    username: 'anjalisingh',
    avatarUrl: 'https://picsum.photos/seed/user3/100/100', 
    currentAuraId: null,
    status: 'Typing...',
    hasViewedStatus: false,
  },
  {
    id: 'user4',
    name: 'Vikram Patel',
    username: 'vikrampatel',
    avatarUrl: 'https://picsum.photos/seed/user4/100/100', 
    currentAuraId: 'chill',
    status: 'Feeling Chill 😎',
    hasViewedStatus: true,
  },
  {
    id: 'user5',
    name: 'Deepika Iyer',
    username: 'deepika_iyer',
    avatarUrl: 'https://picsum.photos/seed/user5/100/100', 
    currentAuraId: 'energetic',
    status: 'Ready to go!',
    hasViewedStatus: false,
  },
  {
    id: 'user6',
    name: 'Arjun Reddy',
    username: 'arjunreddy',
    avatarUrl: 'https://picsum.photos/seed/user6/100/100', 
    currentAuraId: null,
    status: 'Away',
    hasViewedStatus: false,
  },
  {
    id: 'user7',
    name: 'Sneha Kapoor',
    username: 'snehakapoor',
    avatarUrl: 'https://picsum.photos/seed/user7/100/100', 
    currentAuraId: 'playful',
    status: 'Feeling playful! 🎉',
    hasViewedStatus: true,
  },
  { // New user for chat request demonstration
    id: 'user8RequestSender',
    name: 'Rajesh Gupta (Wants to Connect)',
    username: 'rajesh_g',
    avatarUrl: 'https://picsum.photos/seed/user8/100/100',
    currentAuraId: 'calm',
    status: 'Exploring BharatConnect',
  },
  { // New user for chat request demonstration (sender perspective)
    id: 'user9RequestRecipient',
    name: 'Meera Iyer (Request Sent)',
    username: 'meera_iyer9',
    avatarUrl: 'https://picsum.photos/seed/user9/100/100',
    currentAuraId: null,
    status: 'Online',
  },
   { // New user for rejected request demonstration
    id: 'user10RejectedBy',
    name: 'Amit Verma (Rejected You)',
    username: 'amit_v',
    avatarUrl: 'https://picsum.photos/seed/user10/100/100',
    currentAuraId: 'sad',
    status: 'Offline',
  },
  { // New user for current user to reject
    id: 'user11ToReject',
    name: 'Sunita Rao (Wants to Connect)',
    username: 'sunita_rao11',
    avatarUrl: 'https://picsum.photos/seed/user11/100/100',
    currentAuraId: 'focused',
    status: 'Online',
  }
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
  // Mock messages for chat requests
  chat8_request_from_user8: [ // CurrentUser is recipient
    { id: 'msg_req_8_1', chatId: 'chat8_request_from_user8', senderId: 'user8RequestSender', text: 'Hi there! I saw your profile and would love to connect regarding our mutual interest in tech.', timestamp: Date.now() - 1000 * 60 * 5, type: 'text' },
  ],
  chat9_request_to_user9: [ // CurrentUser is sender
    { id: 'msg_req_9_1', chatId: 'chat9_request_to_user9', senderId: 'currentUser', text: 'Hello Meera, I would like to discuss a potential collaboration.', timestamp: Date.now() - 1000 * 60 * 10, type: 'text', status: 'sent' },
  ],
  chat10_rejected_by_user10: [ // CurrentUser sent, user10 rejected
    { id: 'msg_req_10_1', chatId: 'chat10_rejected_by_user10', senderId: 'currentUser', text: 'Hi Amit, hope you are doing well.', timestamp: Date.now() - 1000 * 60 * 60 * 24, type: 'text', status: 'sent' },
  ],
   chat11_request_from_user11: [ // CurrentUser is recipient, to demonstrate rejecting
    { id: 'msg_req_11_1', chatId: 'chat11_request_from_user11', senderId: 'user11ToReject', text: 'Hey, can we chat for a moment?', timestamp: Date.now() - 1000 * 60 * 2, type: 'text' },
  ],
};

export const mockChats: Chat[] = [
  { // Chat request for current user to action
    id: 'chat8_request_from_user8',
    type: 'individual',
    name: mockUsers.find(u => u.id === 'user8RequestSender')?.name || 'Rajesh Gupta',
    contactUserId: 'user8RequestSender',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user8RequestSender')!],
    lastMessage: mockMessagesData.chat8_request_from_user8[0],
    unreadCount: 1,
    avatarUrl: mockUsers.find(u => u.id === 'user8RequestSender')?.avatarUrl,
    requestStatus: 'awaiting_action',
    requesterId: 'user8RequestSender',
    firstMessageTextPreview: mockMessagesData.chat8_request_from_user8[0].text,
  },
  { // Chat request current user has sent, pending
    id: 'chat9_request_to_user9',
    type: 'individual',
    name: mockUsers.find(u => u.id === 'user9RequestRecipient')?.name || 'Meera Iyer',
    contactUserId: 'user9RequestRecipient',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user9RequestRecipient')!],
    lastMessage: mockMessagesData.chat9_request_to_user9[0],
    unreadCount: 0,
    avatarUrl: mockUsers.find(u => u.id === 'user9RequestRecipient')?.avatarUrl,
    requestStatus: 'pending',
    requesterId: 'currentUser',
    firstMessageTextPreview: mockMessagesData.chat9_request_to_user9[0].text,
  },
  { // Chat request current user sent, was rejected
    id: 'chat10_rejected_by_user10',
    type: 'individual',
    name: mockUsers.find(u => u.id === 'user10RejectedBy')?.name || 'Amit Verma',
    contactUserId: 'user10RejectedBy',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user10RejectedBy')!],
    lastMessage: mockMessagesData.chat10_rejected_by_user10[0],
    unreadCount: 0,
    avatarUrl: mockUsers.find(u => u.id === 'user10RejectedBy')?.avatarUrl,
    requestStatus: 'rejected', // Recipient (user10) rejected
    requesterId: 'currentUser',
    firstMessageTextPreview: mockMessagesData.chat10_rejected_by_user10[0].text,
  },
   { // Chat request for current user to action (for rejection demo)
    id: 'chat11_request_from_user11',
    type: 'individual',
    name: mockUsers.find(u => u.id === 'user11ToReject')?.name || 'Sunita Rao',
    contactUserId: 'user11ToReject',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user11ToReject')!],
    lastMessage: mockMessagesData.chat11_request_from_user11[0],
    unreadCount: 1,
    avatarUrl: mockUsers.find(u => u.id === 'user11ToReject')?.avatarUrl,
    requestStatus: 'awaiting_action',
    requesterId: 'user11ToReject',
    firstMessageTextPreview: mockMessagesData.chat11_request_from_user11[0].text,
  },
  // Existing chats (implicitly 'accepted' or 'none')
  {
    id: 'chat1',
    type: 'individual',
    name: 'Priya Sharma',
    contactUserId: 'user1',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user1')!],
    lastMessage: mockMessagesData.chat1[mockMessagesData.chat1.length -1],
    unreadCount: 2,
    avatarUrl: mockUsers.find(u => u.id === 'user1')?.avatarUrl,
    requestStatus: 'accepted', // Explicitly accepted for clarity
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
    requestStatus: 'none', // Assumed to be a pre-existing chat
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
    requestStatus: 'accepted',
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
    requestStatus: 'none',
  },
  {
    id: 'chat5',
    type: 'individual',
    name: 'Deepika Iyer',
    contactUserId: 'user5',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user5')!],
    lastMessage: mockMessagesData.chat5[mockMessagesData.chat5.length -1],
    unreadCount: 0,
    avatarUrl: mockUsers.find(u => u.id === 'user5')?.avatarUrl,
    requestStatus: 'accepted',
  },
  {
    id: 'chat6',
    type: 'individual',
    name: 'Arjun Reddy',
    contactUserId: 'user6',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user6')!],
    lastMessage: mockMessagesData.chat6[mockMessagesData.chat6.length - 1],
    unreadCount: 1,
    avatarUrl: mockUsers.find(u => u.id === 'user6')?.avatarUrl,
    requestStatus: 'none',
  },
  {
    id: 'chat7',
    type: 'individual',
    name: 'Sneha Kapoor',
    contactUserId: 'user7',
    participants: [mockCurrentUser, mockUsers.find(u => u.id === 'user7')!],
    lastMessage: mockMessagesData.chat7[mockMessagesData.chat7.length - 1],
    unreadCount: 3,
    avatarUrl: mockUsers.find(u => u.id === 'user7')?.avatarUrl,
    requestStatus: 'accepted',
  },
].sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));


export const mockAuraBarItemsData = (): User[] => {
  const allMockUsers = [mockCurrentUser, ...mockUsers];
  // Ensure current user is at the beginning if their name is set (which it is by default)
  let sortedUsers = allMockUsers;
  const currentUserIndex = sortedUsers.findIndex(u => u.id === mockCurrentUser.id);

  if (currentUserIndex > 0) { // If current user exists and is not first
    const currentUser = sortedUsers.splice(currentUserIndex, 1)[0];
    sortedUsers.unshift(currentUser);
  } else if (currentUserIndex === -1 && mockCurrentUser.name) { // If current user is not in the list but has a name
     sortedUsers.unshift(mockCurrentUser);
  }
  
  return sortedUsers.map(user => {
    const aura = getAuraById(user.currentAuraId);
    return {
      ...user,
      status: aura ? `Feeling ${aura.name} ${aura.emoji}` : user.status || 'Offline',
    };
  }).filter(user => !['user8RequestSender', 'user9RequestRecipient', 'user10RejectedBy', 'user11ToReject'].includes(user.id)); // Filter out special users for requests from aura bar for now
};

export const mockStatusUpdates: StatusUpdate[] = [
  { id: 'status1', userId: 'user1', timestamp: Date.now() - 1000 * 60 * 30, imageUrl: 'https://picsum.photos/seed/statusUser1/300/500', viewedByCurrentUser: false },
  { id: 'status2', userId: 'user3', timestamp: Date.now() - 1000 * 60 * 60 * 2, imageUrl: 'https://picsum.photos/seed/statusUser3/300/500', viewedByCurrentUser: false },
  { id: 'status3', userId: 'user5', timestamp: Date.now() - 1000 * 60 * 60 * 5, imageUrl: 'https://picsum.photos/seed/statusUser5/300/500', viewedByCurrentUser: false },
  { id: 'status4', userId: 'user2', timestamp: Date.now() - 1000 * 60 * 60 * 24, text: 'Enjoying the long weekend! ☀️', viewedByCurrentUser: true }, 
  { id: 'status5', userId: 'user4', timestamp: Date.now() - 1000 * 60 * 60 * 28, imageUrl: 'https://picsum.photos/seed/statusUser4/300/500', viewedByCurrentUser: true },
];
