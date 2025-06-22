
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, UserCircle2, Link2, MessageSquare, UserX, Loader2, Eye, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { firestore } from '@/lib/firebase';
import { doc, deleteDoc, collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User as BharatConnectUserType, BharatConnectFirestoreUser } from '@/services/profileService';
import { getUserFullProfile } from '@/services/profileService';

interface ConnectionDisplayUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  username?: string | null;
  bio?: string | null;
  email?: string | null;
  chatId: string;
}

const MAX_INITIAL_CONNECTIONS = 2;

export default function ConnectionsCard() {
  const { authUser, isAuthLoading: isAuthContextLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [connections, setConnections] = useState<ConnectionDisplayUser[]>([]);
  const [isLoadingConnectionsData, setIsLoadingConnectionsData] = useState(true);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<ConnectionDisplayUser | null>(null);
  const [detailedProfile, setDetailedProfile] = useState<BharatConnectFirestoreUser | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [removingConnectionId, setRemovingConnectionId] = useState<string | null>(null);
  const [showAllConnections, setShowAllConnections] = useState(false);

  useEffect(() => {
    if (isAuthContextLoading || !authUser?.id) {
      setConnections([]);
      setIsLoadingConnectionsData(true);
      return;
    }
    
    const currentUserId = authUser.id;

    const fetchConnections = async () => {
      setIsLoadingConnectionsData(true);
      try {
        const chatsRef = collection(firestore, 'chats');
        const q = query(
          chatsRef,
          where('participants', 'array-contains', currentUserId),
          where('type', '==', 'individual')
        );
        const querySnapshot = await getDocs(q);

        const acceptedChats = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(chat => !chat.requestStatus || chat.requestStatus === 'accepted' || chat.requestStatus === 'none');

        if (acceptedChats.length === 0) {
            setConnections([]);
            setIsLoadingConnectionsData(false);
            return;
        }

        const fetchedConnectionsPromises = acceptedChats.map(async (chat) => {
          const contactId = chat.participants.find((pId: string) => pId !== currentUserId);
          if (!contactId) return null;

          const profile = await getUserFullProfile(contactId);
          return {
            id: contactId,
            name: profile?.name || 'User',
            avatarUrl: profile?.avatarUrl,
            username: profile?.username,
            bio: profile?.bio,
            email: profile?.email,
            chatId: chat.id,
          };
        });
        
        let fetchedConnections = (await Promise.all(fetchedConnectionsPromises)).filter(Boolean) as ConnectionDisplayUser[];
        fetchedConnections.sort((a, b) => a.name.localeCompare(b.name));
        setConnections(fetchedConnections);

      } catch (error) {
        console.error("Error fetching connections directly:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load your connections.' });
        setConnections([]);
      } finally {
        setIsLoadingConnectionsData(false);
      }
    };

    fetchConnections();
  }, [authUser, isAuthContextLoading, toast]);


  const handleViewProfile = async (user: ConnectionDisplayUser) => {
    setSelectedUserForProfile(user);
    setIsLoadingProfile(true);
    try {
      const profile = await getUserFullProfile(user.id);
      // getUserFullProfile returns User, but detailedProfile state is BharatConnectFirestoreUser. We need to adapt.
      // For now, let's cast, but ideally, the state would also be of type User | null.
      // This is okay since we're just displaying.
      if (profile) {
        setDetailedProfile({
            id: profile.id,
            email: profile.email || '',
            username: profile.username || '',
            displayName: profile.name || '',
            photoURL: profile.avatarUrl,
            phoneNumber: profile.phone,
            bio: profile.bio,
            onboardingComplete: profile.onboardingComplete || false,
        });
      } else {
        setDetailedProfile(null);
      }
    } catch (error) {
      console.error("Error fetching detailed profile:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load user profile.' });
      setDetailedProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const deleteChatMessages = async (chatId: string): Promise<void> => {
    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    if (messagesSnapshot.empty) return;

    const batch = writeBatch(firestore);
    messagesSnapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  };

  const handleRemoveConnection = async (chatId: string, contactUserId: string) => {
    if (!authUser?.id) return;
    setRemovingConnectionId(chatId);
    try {
      await deleteChatMessages(chatId);
      const chatDocRef = doc(firestore, 'chats', chatId);
      await deleteDoc(chatDocRef);

      setConnections(prevConnections => prevConnections.filter(c => c.chatId !== chatId));

      toast({
        title: 'Connection Removed',
        description: `You are no longer connected with ${connections.find(c => c.chatId === chatId)?.name || 'the user'}.`,
      });
    } catch (error: any) {
      console.error(`Error removing connection ${chatId}:`, error);
      toast({
        variant: 'destructive',
        title: 'Removal Failed',
        description: error.message || 'Could not remove connection.',
      });
    } finally {
      setRemovingConnectionId(null);
    }
  };

  const isLoadingDisplay = isAuthContextLoading || isLoadingConnectionsData;
  const connectionsToDisplay = showAllConnections ? connections : connections.slice(0, MAX_INITIAL_CONNECTIONS);
  const canShowMore = connections.length > MAX_INITIAL_CONNECTIONS && !showAllConnections;

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-card">
        <CardHeader>
          <div className="flex items-center">
            <Link2 className="w-5 h-5 mr-2 text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary" />
            <CardTitle className="text-lg">My Connections</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingDisplay ? (
            <div className="space-y-3 py-2" aria-busy="true" aria-live="polite">
              {Array.from({ length: MAX_INITIAL_CONNECTIONS }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3 p-2">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <Skeleton className="w-3/4 h-4 rounded" />
                  <Skeleton className="w-8 h-8 rounded-md ml-auto" />
                  <Skeleton className="w-8 h-8 rounded-md" />
                </div>
              ))}
            </div>
          ) : connections.length > 0 ? (
            <>
              <ScrollArea className={cn("h-auto", showAllConnections && connections.length > 4 ? "max-h-[240px] pr-3 custom-scrollbar-dark" : "max-h-none")}>
                <div className="space-y-1">
                  {connectionsToDisplay.map(connection => (
                    <div
                      key={connection.id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted/30 rounded-lg transition-colors group"
                    >
                      <div
                        className="flex items-center flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleViewProfile(connection)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleViewProfile(connection)}
                        aria-label={`View profile of ${connection.name}`}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={connection.avatarUrl || undefined} alt={connection.name} data-ai-hint="person avatar"/>
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            <UserCircle2 className="w-7 h-7" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="ml-3 text-sm text-foreground truncate group-hover:text-primary">{connection.name}</span>
                      </div>
                      <div className="flex items-center space-x-1 ml-auto">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-primary" onClick={() => handleChat(connection.chatId)} aria-label={`Chat with ${connection.name}`}>
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Chat with {connection.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                             <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-destructive" aria-label={`Remove connection with ${connection.name}`} disabled={removingConnectionId === connection.chatId}>
                                  {removingConnectionId === connection.chatId ? <Loader2 className="w-4 h-4 animate-spin"/> : <UserX className="w-4 h-4" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Connection?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove your connection with {connection.name}? This will delete your chat history and they will no longer appear in your connections. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveConnection(connection.chatId, connection.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <TooltipContent>
                              <p>Remove connection</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {canShowMore && (
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-sm text-primary hover:bg-primary/10"
                  onClick={() => setShowAllConnections(true)}
                >
                  <ChevronDown className="w-4 h-4 mr-1" />
                  View More ({connections.length - MAX_INITIAL_CONNECTIONS} more)
                </Button>
              )}
              {showAllConnections && connections.length > MAX_INITIAL_CONNECTIONS && (
                 <Button
                  variant="ghost"
                  className="w-full mt-2 text-sm text-primary hover:bg-primary/10"
                  onClick={() => setShowAllConnections(false)}
                >
                  <ChevronUp className="w-4 h-4 mr-1" />
                  View Less
                </Button>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active connections found.</p>
              <p className="text-xs text-muted-foreground mt-1">Start chatting with people to see them here!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUserForProfile && (
        <Dialog open={!!selectedUserForProfile} onOpenChange={(isOpen) => { if (!isOpen) setSelectedUserForProfile(null); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">{isLoadingProfile ? 'Loading Profile...' : (detailedProfile?.displayName || selectedUserForProfile.name)}</DialogTitle>
            </DialogHeader>
            {isLoadingProfile ? (
              <div className="py-8 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="py-4 space-y-4">
                <div className="flex flex-col items-center space-y-2">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={detailedProfile?.photoURL || selectedUserForProfile.avatarUrl || undefined} alt={detailedProfile?.displayName || selectedUserForProfile.name} data-ai-hint="person avatar"/>
                    <AvatarFallback className="bg-muted text-4xl"><UserCircle2 className="w-16 h-16 text-muted-foreground" /></AvatarFallback>
                  </Avatar>
                  <h3 className="text-lg font-semibold text-foreground">{detailedProfile?.displayName || selectedUserForProfile.name}</h3>
                  {(detailedProfile?.username || selectedUserForProfile.username) && <p className="text-sm text-muted-foreground">@{detailedProfile?.username || selectedUserForProfile.username}</p>}
                </div>

                {(detailedProfile?.bio || selectedUserForProfile.bio) && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">BIO</h4>
                    <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md shadow-inner">{detailedProfile?.bio || selectedUserForProfile.bio}</p>
                  </div>
                )}
                {(detailedProfile?.email || selectedUserForProfile.email) && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">EMAIL</h4>
                    <div className="flex items-center space-x-2 p-2.5 rounded-md border bg-muted/30 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm text-foreground">{detailedProfile?.email || selectedUserForProfile.email}</span>
                    </div>
                  </div>
                )}
                {!(detailedProfile?.bio || selectedUserForProfile.bio) && !(detailedProfile?.email || selectedUserForProfile.email) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No additional details to display.</p>
                )}
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
