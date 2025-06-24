
"use client";

import type { ReactNode} from 'react';
import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { User, Message, Chat } from '@/types';
// import { mockUsers, mockMessagesData, mockChats as initialMockChatsData } from '@/lib/mock-data'; // Mock data import removed for chats
import { useAuth } from './AuthContext';

interface ChatContextType {
  contacts: User[]; // This might become obsolete or be derived from chats
  messages: { [chatId: string]: Message[] }; // This might also be better scoped or fetched on demand
  chats: Chat[];
  setChats: (newChatsOrUpdater: Chat[] | ((prevChats: Chat[]) => Chat[])) => void; // Allow updater function
  getChatById: (chatId: string) => Chat | undefined;
  getMessagesForChat: (chatId: string) => Message[]; // Likely to be removed or re-thought if messages aren't global
  sendMessage: (chatId: string, message: Message) => void; // This should be a server action
  isLoadingChats: boolean; 
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { authUser } = useAuth();
  // Contacts and messages might be better managed elsewhere or fetched on demand
  // For now, keeping them minimal as they are not the focus of the current issue.
  const [contacts, setContactsState] = useState<User[]>([]); 
  const [messages, setMessagesState] = useState<{ [chatId: string]: Message[] }>({});
  
  // Initialize chats as an empty array. HomePage will populate this.
  const [chats, setChatsState] = useState<Chat[]>([]); 
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  const getChatById = useCallback((chatId: string): Chat | undefined => {
    return chats.find(chat => chat.id === chatId);
  }, [chats]);

  const getMessagesForChat = useCallback((chatId: string): Message[] => {
    // This is mock behavior and should be replaced by actual message fetching for a given chat
    return messages[chatId] || [];
  }, [messages]);

  const sendMessage = useCallback((chatId: string, message: Message) => {
    // This is mock behavior and should be a server action that updates Firestore
    // and then relies on listeners to update the local state.
    setMessagesState(prevMessages => ({
      ...prevMessages,
      [chatId]: [...(prevMessages[chatId] || []), message],
    }));
    setChatsState(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId ? { ...chat, lastMessage: message, updatedAt: message.timestamp } : chat
      ).sort((a,b) => (b.lastMessage?.timestamp || b.updatedAt || 0) - (a.lastMessage?.timestamp || a.updatedAt || 0)) // Keep sorted
    );
  }, []);

  // Allow setChats to accept an updater function for more complex state updates if needed
  const setChatsCallback = useCallback((newChatsOrUpdater: Chat[] | ((prevChats: Chat[]) => Chat[])) => {
    setChatsState(newChatsOrUpdater);
    // This check ensures we only try to set loading to false once.
    setIsLoadingChats(prevIsLoading => {
        if (prevIsLoading) {
            return false;
        }
        return prevIsLoading;
    });
  }, []); // `setIsLoadingChats` and `setChatsState` are stable and don't need to be in the array.
  
  const contextValue = useMemo(() => ({
    contacts,
    messages,
    chats,
    setChats: setChatsCallback,
    getChatById,
    getMessagesForChat,
    sendMessage,
    isLoadingChats,
  }), [contacts, messages, chats, setChatsCallback, getChatById, getMessagesForChat, sendMessage, isLoadingChats]);

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
