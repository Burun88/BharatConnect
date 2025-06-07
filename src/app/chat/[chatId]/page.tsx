
"use client";

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Using Input as base for textarea-like component
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import MessageBubble from '@/components/message-bubble';
import type { Message, User, Chat } from '@/types';
import { AURA_OPTIONS } from '@/types';
import { mockMessagesData, mockUsers, mockChats, mockCurrentUser } from '@/lib/mock-data';
import { ArrowLeft, Paperclip, Send, SmilePlus, MoreVertical, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [chatDetails, setChatDetails] = useState<Chat | null>(null);
  const [contact, setContact] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate fetching chat details and messages
    setTimeout(() => {
      const currentChat = mockChats.find(c => c.id === chatId);
      if (currentChat) {
        setChatDetails(currentChat);
        const contactUser = currentChat.contactUserId ? mockUsers.find(u => u.id === currentChat.contactUserId) : null;
        setContact(contactUser);
        const chatMessages = mockMessagesData[chatId] || [];
        setMessages(chatMessages);
      }
      setIsLoading(false);
    }, 1000);
  }, [chatId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const messageToSend: Message = {
      id: `msg${Date.now()}`,
      chatId: chatId,
      senderId: 'currentUser',
      text: newMessage.trim(),
      timestamp: Date.now(),
      status: 'sent',
      type: 'text',
    };
    setMessages(prevMessages => [...prevMessages, messageToSend]);
    setNewMessage('');

    // Simulate receiving a reply after a short delay
    if (contact) {
        setTimeout(() => {
            const replyMessage: Message = {
                id: `reply${Date.now()}`,
                chatId: chatId,
                senderId: contact.id,
                text: `Thanks for your message! (mock reply from ${contact.name})`,
                timestamp: Date.now(),
                type: 'text',
            };
            setMessages(prevMessages => [...prevMessages, replyMessage]);
        }, 1500);
    }
  };
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  }

  const contactAura = contact?.currentAuraId ? AURA_OPTIONS.find(a => a.id === contact.currentAuraId) : null;
  const contactStatus = contactAura ? `Feeling ${contactAura.name} ${contactAura.emoji}` : contact?.status;


  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        {/* Header Skeleton */}
        <header className="flex items-center p-3 border-b sticky top-0 bg-background z-10 h-16">
          <Skeleton className="w-8 h-8 rounded-full mr-2" />
          <Skeleton className="w-10 h-10 rounded-full mr-3" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="w-2/4 h-4" />
            <Skeleton className="w-1/3 h-3" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full ml-auto" />
        </header>
        {/* Message Area Skeleton */}
        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className={`w-3/5 h-12 rounded-lg ${i % 2 === 0 ? 'bg-secondary' : 'bg-primary/80'}`} />
            </div>
          ))}
        </div>
        {/* Input Footer Skeleton */}
        <footer className="p-3 border-t bg-background sticky bottom-0 z-10">
          <div className="flex items-center space-x-2">
            <Skeleton className="w-8 h-10 rounded-md" />
            <Skeleton className="flex-1 h-10 rounded-md" />
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
        </footer>
      </div>
    );
  }

  if (!chatDetails || !contact) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-muted-foreground">Chat not found.</p>
        <Button variant="link" onClick={() => router.push('/')}>Go to Chats</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center p-2.5 border-b sticky top-0 bg-background z-10 h-16">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10 mr-3">
          {contact.avatarUrl && (
            <AvatarImage src={contact.avatarUrl} alt={contact.name} data-ai-hint="person avatar" />
          )}
          <AvatarFallback className={cn(contactAura?.gradient)}>
            {contactAura ? contactAura.emoji : getInitials(contact.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className={cn(
            "text-sm font-semibold truncate",
            contactAura && "text-gradient-primary-accent"
            )}>{contact.name}</h2>
          <p className="text-xs text-muted-foreground truncate">{contactStatus || 'Offline'}</p>
        </div>
        <Button variant="ghost" size="icon" className="ml-auto">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </header>

      {/* Message Area */}
      <ScrollArea className="flex-grow" ref={scrollAreaRef}>
        <div className="flex flex-col p-4 space-y-2 pb-6"> {/* Added flex flex-col */}
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} isOutgoing={msg.senderId === 'currentUser'} />
          ))}
        </div>
      </ScrollArea>

      {/* Message Input Footer */}
      <footer className="p-2 border-t bg-background sticky bottom-0 z-10">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <Button variant="ghost" size="icon" type="button">
            <SmilePlus className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={1}
            className="flex-1 resize-none min-h-[40px] max-h-[100px] rounded-full px-4 py-2.5 leading-tight self-center"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e as any);
              }
            }}
          />
          {newMessage.trim() === '' ? (
            <>
             <Button variant="ghost" size="icon" type="button">
                <Paperclip className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" type="button">
                <PlusCircle className="w-5 h-5 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <Button type="submit" size="icon" className="rounded-full bg-primary text-primary-foreground w-10 h-10 flex-shrink-0">
              <Send className="w-5 h-5" />
            </Button>
          )}
        </form>
      </footer>
    </div>
  );
}
