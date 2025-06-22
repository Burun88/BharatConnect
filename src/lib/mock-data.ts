
import type { User, Chat, Message, UserAura, StatusUpdate } from '@/types';
import { AURA_OPTIONS } from '@/types';

export const mockCurrentUser: User = {
  id: 'currentUser', // This will be replaced by actual UID from LocalStorage in components
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
    currentAuraId: 'happy', // Added aura
    status: 'Online',
    hasViewedStatus: false,
  },
  {
    id: 'user2',
    name: 'Rahul Kumar',
    username: 'rahulkumar',
    avatarUrl: 'https://picsum.photos/seed/user2/100/100',
    currentAuraId: 'focused', // Added aura
    status: 'Last seen yesterday at 10:30 PM',
    hasViewedStatus: true,
  },
  {
    id: 'user3',
    name: 'Anjali Singh',
    username: 'anjalisingh',
    avatarUrl: 'https://picsum.photos/seed/user3/100/100',
    currentAuraId: null, // No aura
    status: 'Typing...',
    hasViewedStatus: false,
  },
  {
    id: 'user4',
    name: 'Vikram Patel',
    username: 'vikrampatel',
    avatarUrl: 'https://picsum.photos/seed/user4/100/100',
    currentAuraId: 'chill', // Added aura
    status: 'Feeling Chill 😎',
    hasViewedStatus: true,
  },
  {
    id: 'user5',
    name: 'Deepika Iyer',
    username: 'deepika_iyer',
    avatarUrl: 'https://picsum.photos/seed/user5/100/100',
    currentAuraId: 'energetic', // Added aura
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
    currentAuraId: 'playful', // Added aura
    status: 'Feeling playful! 🎉',
    hasViewedStatus: true,
  },
  {
    id: 'user8RequestSender',
    name: 'Rajesh Gupta',
    username: 'rajesh_g',
    avatarUrl: 'https://picsum.photos/seed/user8/100/100',
    currentAuraId: 'calm',
    status: 'Exploring BharatConnect',
    bio: 'Tech enthusiast and avid reader. Always open to new ideas and collaborations in the software development space. Based in Bangalore.',
    email: 'rajesh.g@example.com',
  },
  {
    id: 'user9RequestRecipient',
    name: 'Meera Iyer',
    username: 'meera_iyer9',
    avatarUrl: 'https://picsum.photos/seed/user9/100/100',
    currentAuraId: null,
    status: 'Online',
    bio: 'Musician and artist from Mumbai. Loves to travel and explore new cultures.',
    email: 'meera.art@example.com',
  },
   {
    id: 'user10RejectedBy',
    name: 'Amit Verma',
    username: 'amit_v',
    avatarUrl: 'https://picsum.photos/seed/user10/100/100',
    currentAuraId: 'sad',
    status: 'Offline',
  },
  {
    id: 'user11ToReject',
    name: 'Sunita Rao',
    username: 'sunita_rao11',
    avatarUrl: 'https://picsum.photos/seed/user11/100/100',
    currentAuraId: 'focused',
    status: 'Online',
  },
  {
    id: '69wLKGZvjEUcCKLnVmDr7qqqOMM2',
    name: 'nisanta das',
    username: 'nisantadas',
    avatarUrl: 'https://firebasestorage.googleapis.com/v0/b/bharatconnect-i8510.firebasestorage.app/o/profileImages%2F69wLKGZvjEUcCKLnVmDr7qqqOMM2%2FprofileImage.png?alt=media&token=754c927f-de1b-4b9e-bf15-a7bb8dbe455f',
    currentAuraId: null,
    status: 'Online',
    bio: 'Web developer and open-source contributor. Currently learning about AI and machine learning.',
    email: 'nisanta.das@example.dev'
  },
  {
    id: 'UMQIs0ucLbcaJmC8ef3P3jQeRVs2',
    name: 'Ayandip',
    username: 'ayandip',
    avatarUrl: null,
    currentAuraId: null,
    status: 'Offline',
  }
];

const getAuraById = (id: string | null | undefined): UserAura | undefined => AURA_OPTIONS.find(a => a.id === id);

export const mockMessagesData: { [chatId: string]: Message[] } = {
  chat1: [
    { id: 'msg1_1', chatId: 'chat1', senderId: 'user1', text: 'Hey there! How are you?', timestamp: Date.now() - 1000 * 60 * 60 * 2, type: 'text' },
    { id: 'msg1_2', chatId: 'chat1', senderId: 'currentUser', text: 'Hi Priya! I am good, thanks for asking. You?', timestamp: Date.now() - 1000 * 60 * 58, type: 'text', readBy: ['user1'] },
    { id: 'msg1_3', chatId: 'chat1', senderId: 'user1', text: 'Doing great! Just working on some stuff.', timestamp: Date.now() - 1000 * 60 * 55, type: 'text' },
    { id: 'msg1_4', chatId: 'chat1', senderId: 'system', text: 'Priya is now Feeling Happy 😄', timestamp: Date.now() - 1000 * 60 * 50, type: 'system' },
  ],
  chat2: [
    { id: 'msg2_1', chatId: 'chat2', senderId: 'user2', text: 'Can you send me the report?', timestamp: Date.now() - 1000 * 60 * 30, type: 'text' },
    { id: 'msg2_2', chatId: 'chat2', senderId: 'currentUser', text: 'Sure, let me find it.', timestamp: Date.now() - 1000 * 60 * 28, type: 'text', readBy: [] },
  ],
  chat3: [
    { id: 'msg3_1', chatId: 'chat3', senderId: 'user3', text: 'Lunch today?', timestamp: Date.now() - 1000 * 60 * 5, type: 'text' },
  ],
   chat4: [
    { id: 'msg4_1', chatId: 'chat4', senderId: 'user4', text: 'Just chilling, wbu?', timestamp: Date.now() - 1000 * 60 * 120, type: 'text' },
    { id: 'msg4_2', chatId: 'chat4', senderId: 'currentUser', text: 'Same here, enjoying the weekend!', timestamp: Date.now() - 1000 * 60 * 115, type: 'text', readBy: [] },
  ],
  chat5: [
    { id: 'msg5_1', chatId: 'chat5', senderId: 'user5', text: 'Morning! Coffee?', timestamp: Date.now() - 1000 * 60 * 60 * 3, type: 'text' },
    { id: 'msg5_2', chatId: 'chat5', senderId: 'currentUser', text: 'Good morning! Sounds great.', timestamp: Date.now() - 1000 * 60 * 50, type: 'text', readBy: ['user5'] },
  ],
  chat6: [
    { id: 'msg6_1', chatId: 'chat6', senderId: 'user6', text: 'Project update?', timestamp: Date.now() - 1000 * 60 * 40, type: 'text' },
  ],
  chat7: [
    { id: 'msg7_1', chatId: 'chat7', senderId: 'user7', text: 'Party tonight! You in?', timestamp: Date.now() - 1000 * 60 * 15, type: 'text' },
    { id: 'msg7_2', chatId: 'chat7', senderId: 'currentUser', text: 'Definitely! What time?', timestamp: Date.now() - 1000 * 60 * 10, type: 'text', readBy: []},
  ],
  // Mock messages for chat requests
  ['req_rec_user8RequestSender']: [
    { id: 'msg_req_8_1', chatId: 'req_rec_user8RequestSender', senderId: 'user8RequestSender', text: 'Hi there! I saw your profile and would love to connect regarding our mutual interest in tech.', timestamp: Date.now() - 1000 * 60 * 5, type: 'text', readBy: ['user8RequestSender'] },
  ],
  ['req_sent_user9RequestRecipient']: [
    { id: 'msg_req_9_1', chatId: 'req_sent_user9RequestRecipient', senderId: 'currentUser', text: 'Hello Meera, I would like to discuss a potential collaboration.', timestamp: Date.now() - 1000 * 60 * 10, type: 'text', readBy: ['currentUser'] },
  ],
  ['req_sent_user10RejectedBy']: [
    { id: 'msg_req_10_1', chatId: 'req_sent_user10RejectedBy', senderId: 'currentUser', text: 'Hi Amit, hope you are doing well.', timestamp: Date.now() - 1000 * 60 * 60 * 24, type: 'text', readBy: ['currentUser'] },
  ],
   ['req_rec_user11ToReject']: [
    { id: 'msg_req_11_1', chatId: 'req_rec_user11ToReject', senderId: 'user11ToReject', text: 'Hey, can we chat for a moment?', timestamp: Date.now() - 1000 * 60 * 2, type: 'text', readBy: ['user11ToReject'] },
  ],
};

export const mockChats: Chat[] = [
  {
    id: 'req_rec_user8RequestSender', // Assuming currentUser is recipient
    type: 'individual',
    name: mockUsers.find(u => u.id === 'user8RequestSender')?.name || 'Rajesh Gupta',
    contactUserId: 'user8RequestSender',
    participants: [mockCurrentUser.id, 'user8RequestSender'],
    lastMessage: mockMessagesData['req_rec_user8RequestSender']?.[0] || null,
    unreadCount: 1,
    avatarUrl: mockUsers.find(u => u.id === 'user8RequestSender')?.avatarUrl,
    requestStatus: 'awaiting_action',
    requesterId: 'user8RequestSender',
    firstMessageTextPreview: mockMessagesData['req_rec_user8RequestSender']?.[0]?.text || "Wants to connect.",
  },
  {
    id: 'req_sent_user9RequestRecipient', // Assuming currentUser is sender
    type: 'individual',
    name: mockUsers.find(u => u.id === 'user9RequestRecipient')?.name || 'Meera Iyer',
    contactUserId: 'user9RequestRecipient',
    participants: [mockCurrentUser.id, 'user9RequestRecipient'],
    lastMessage: mockMessagesData['req_sent_user9RequestRecipient']?.[0] || null,
    unreadCount: 0,
    avatarUrl: mockUsers.find(u => u.id === 'user9RequestRecipient')?.avatarUrl,
    requestStatus: 'pending',
    requesterId: 'currentUser',
    firstMessageTextPreview: mockMessagesData['req_sent_user9RequestRecipient']?.[0]?.text || "Request sent.",
  },
  {
    id: 'req_sent_user10RejectedBy', // CurrentUser sent, user10 rejected
    type: 'individual',
    name: mockUsers.find(u => u.id === 'user10RejectedBy')?.name || 'Amit Verma',
    contactUserId: 'user10RejectedBy',
    participants: [mockCurrentUser.id, 'user10RejectedBy'],
    lastMessage: mockMessagesData['req_sent_user10RejectedBy']?.[0] || null,
    unreadCount: 0,
    avatarUrl: mockUsers.find(u => u.id === 'user10RejectedBy')?.avatarUrl,
    requestStatus: 'rejected',
    requesterId: 'currentUser',
    firstMessageTextPreview: mockMessagesData['req_sent_user10RejectedBy']?.[0]?.text || "Request rejected.",
  },
   {
    id: 'req_rec_user11ToReject', // CurrentUser is recipient
    type: 'individual',
    name: mockUsers.find(u => u.id === 'user11ToReject')?.name || 'Sunita Rao',
    contactUserId: 'user11ToReject',
    participants: [mockCurrentUser.id, 'user11ToReject'],
    lastMessage: mockMessagesData['req_rec_user11ToReject']?.[0] || null,
    unreadCount: 1,
    avatarUrl: mockUsers.find(u => u.id === 'user11ToReject')?.avatarUrl,
    requestStatus: 'awaiting_action',
    requesterId: 'user11ToReject',
    firstMessageTextPreview: mockMessagesData['req_rec_user11ToReject']?.[0]?.text || "Wants to connect.",
  },
  // Existing chats (implicitly 'accepted' or 'none')
  {
    id: 'chat1',
    type: 'individual',
    name: 'Priya Sharma',
    contactUserId: 'user1',
    participants: [mockCurrentUser.id, 'user1'],
    lastMessage: mockMessagesData.chat1[mockMessagesData.chat1.length -1],
    unreadCount: 2,
    avatarUrl: mockUsers.find(u => u.id === 'user1')?.avatarUrl,
    requestStatus: 'accepted', // Explicitly accepted for clarity
    acceptedTimestamp: Date.now() - (60 * 60 * 1000), // Accepted 1 hour ago (older than 10 mins)
  },
  {
    id: 'chat2',
    type: 'individual',
    name: 'Rahul Kumar',
    contactUserId: 'user2',
    participants: [mockCurrentUser.id, 'user2'],
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
    participants: [mockCurrentUser.id, 'user3'],
    lastMessage: mockMessagesData.chat3[mockMessagesData.chat3.length - 1],
    unreadCount: 1,
    avatarUrl: mockUsers.find(u => u.id === 'user3')?.avatarUrl,
    requestStatus: 'accepted',
    acceptedTimestamp: Date.now() - (20 * 60 * 1000), // Accepted 20 minutes ago
  },
  {
    id: 'chat4',
    type: 'individual',
    name: 'Vikram Patel',
    contactUserId: 'user4',
    participants: [mockCurrentUser.id, 'user4'],
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
    participants: [mockCurrentUser.id, 'user5'],
    lastMessage: mockMessagesData.chat5[mockMessagesData.chat5.length -1],
    unreadCount: 0,
    avatarUrl: mockUsers.find(u => u.id === 'user5')?.avatarUrl,
    requestStatus: 'accepted',
    acceptedTimestamp: Date.now() - (1000 * 60 * 60 * 24 * 2), // Accepted 2 days ago
  },
  {
    id: 'chat6',
    type: 'individual',
    name: 'Arjun Reddy',
    contactUserId: 'user6',
    participants: [mockCurrentUser.id, 'user6'],
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
    participants: [mockCurrentUser.id, 'user7'],
    lastMessage: mockMessagesData.chat7[mockMessagesData.chat7.length - 1],
    unreadCount: 3,
    avatarUrl: mockUsers.find(u => u.id === 'user7')?.avatarUrl,
    requestStatus: 'accepted',
  },
].sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));


// Modified to accept currentUser as a parameter
export const mockAuraBarItemsData = (currentUser: User): User[] => {
  if (!currentUser || !currentUser.id) {
    // Handle cases where currentUser might not be fully initialized, though HomePage should prevent this.
    return mockUsers.filter(user => user.currentAuraId && !['user8RequestSender', 'user9RequestRecipient', 'user10RejectedBy', 'user11ToReject'].includes(user.id))
                    .map(user => ({...user, status: getAuraById(user.currentAuraId) ? `Feeling ${getAuraById(user.currentAuraId)!.name} ${getAuraById(user.currentAuraId)!.emoji}` : user.status || 'Offline'}));
  }

  // Create a new array with the provided currentUser and other mock users
  // Ensure mockUsers also have their status derived from their aura if present
  const allDisplayUsers = [
    currentUser, 
    ...mockUsers
        .filter(u => u.id !== currentUser.id) 
        .map(u => ({
            ...u,
            status: getAuraById(u.currentAuraId) ? `Feeling ${getAuraById(u.currentAuraId)!.name} ${getAuraById(u.currentAuraId)!.emoji}` : u.status || 'Offline'
        }))
  ];
  
  let sortedUsers = [...allDisplayUsers]; 
  const currentUserIndex = sortedUsers.findIndex(u => u.id === currentUser.id);

  if (currentUserIndex > 0) {
    const userToMove = sortedUsers.splice(currentUserIndex, 1)[0];
    sortedUsers.unshift(userToMove);
  } else if (currentUserIndex === -1) { 
    sortedUsers.unshift(currentUser);
  }

  return sortedUsers.map(user => {
    const aura = getAuraById(user.currentAuraId);
    return {
      ...user,
      status: aura ? `Feeling ${aura.name} ${aura.emoji}` : user.status || 'Offline',
    };
  }).filter(user => 
    !['user8RequestSender', 'user9RequestRecipient', 'user10RejectedBy', 'user11ToReject'].includes(user.id) &&
    (user.id === currentUser.id || user.currentAuraId)
  );
};

export const mockStatusUpdates: StatusUpdate[] = [
  { id: 'status1', userId: 'user1', timestamp: Date.now() - 1000 * 60 * 30, imageUrl: 'https://picsum.photos/seed/statusUser1/300/500', viewedByCurrentUser: false },
  { id: 'status2', userId: 'user3', timestamp: Date.now() - 1000 * 60 * 60 * 2, imageUrl: 'https://picsum.photos/seed/statusUser3/300/500', viewedByCurrentUser: false },
  { id: 'status3', userId: 'user5', timestamp: Date.now() - 1000 * 60 * 60 * 5, imageUrl: 'https://picsum.photos/seed/statusUser5/300/500', viewedByCurrentUser: false },
  { id: 'status4', userId: 'user2', timestamp: Date.now() - 1000 * 60 * 60 * 24, text: 'Enjoying the long weekend! ☀️', viewedByCurrentUser: true },
  { id: 'status5', userId: 'user4', timestamp: Date.now() - 1000 * 60 * 60 * 28, imageUrl: 'https://picsum.photos/seed/statusUser4/300/500', viewedByCurrentUser: true },
];

// This represents the structure in localStorage during onboarding and for general app use.
export interface LocalUserProfile {
  uid: string;
  email: string; // Original casing email
  username?: string | null; // Unique username, stored lowercase
  displayName?: string | null; // Original casing display name
  photoURL?: string | null;
  phoneNumber?: string | null;
  bio?: string | null;
  onboardingComplete: boolean;
}

