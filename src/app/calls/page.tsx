
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, onSnapshot, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

import BottomNavigationBar from "@/components/bottom-navigation-bar";
import PageHeader from "@/components/page-header";
import CallHistoryItem from '@/components/calls/CallHistoryItem';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Search, MoreVertical, PhoneMissed } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { CallDocument, CallType } from '@/types';
import { getUserFullProfile } from '@/services/profileService';
import SwipeablePageWrapper from '@/components/shared/SwipeablePageWrapper';

export default function CallsPage() {
  const router = useRouter();
  const { authUser, isAuthenticated, isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [outgoingCalls, setOutgoingCalls] = useState<CallDocument[]>([]);
  const [incomingCalls, setIncomingCalls] = useState<CallDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authUser?.id) {
      if (!isAuthLoading) setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const callsRef = collection(firestore, 'calls');
    
    const outgoingQuery = query(callsRef, where('callerId', '==', authUser.id), orderBy('createdAt', 'desc'), limit(30));
    const incomingQuery = query(callsRef, where('calleeId', '==', authUser.id), orderBy('createdAt', 'desc'), limit(30));

    const unsubOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
      const callsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CallDocument));
      setOutgoingCalls(callsData);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching outgoing calls:", error);
        toast({ title: "Error", description: "Could not load outgoing calls.", variant: "destructive"});
        setIsLoading(false);
    });

    const unsubIncoming = onSnapshot(incomingQuery, (snapshot) => {
      const callsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CallDocument));
      setIncomingCalls(callsData);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching incoming calls:", error);
        toast({ title: "Error", description: "Could not load incoming calls.", variant: "destructive"});
        setIsLoading(false);
    });

    return () => {
      unsubOutgoing();
      unsubIncoming();
    };
  }, [authUser?.id, isAuthLoading, toast]);
  
  const allCalls = useMemo(() => {
    const combined = [...outgoingCalls, ...incomingCalls];
    const uniqueCalls = Array.from(new Map(combined.map(call => [call.id, call])).values());
    uniqueCalls.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    return uniqueCalls;
  }, [outgoingCalls, incomingCalls]);


  const startCall = useCallback(async (contactId: string, callType: CallType) => {
    if (!authUser) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }
    try {
      const contactProfile = await getUserFullProfile(contactId);
      if (!contactProfile) throw new Error("Could not find contact's profile.");
      
      const callDoc = {
        callerId: authUser.id,
        callerName: authUser.name,
        callerAvatarUrl: authUser.avatarUrl || null,
        calleeId: contactId,
        calleeName: contactProfile.name,
        calleeAvatarUrl: contactProfile.avatarUrl || null,
        status: 'ringing',
        callType,
        createdAt: serverTimestamp(),
      };
      const callsCollection = collection(firestore, 'calls');
      const docRef = await addDoc(callsCollection, callDoc);
      router.push(`/call/${docRef.id}`);
    } catch (error: any) {
      toast({ title: "Call Failed", description: error.message, variant: "destructive" });
    }
  }, [authUser, router, toast]);

  const HeaderActions = () => (
    <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => toast({ title: "Search coming soon!"})}>
            <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => toast({ title: "More options coming soon!"})}>
            <MoreVertical className="h-5 w-5" />
        </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
      <PageHeader title="Calls" showBackButton={false} actions={<HeaderActions />} />
      <SwipeablePageWrapper className="flex-grow overflow-hidden">
        <main className="h-full overflow-y-auto mb-16 hide-scrollbar">
          {isLoading ? (
             Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center p-3 space-x-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="w-8 h-8 rounded-full" />
                </div>
              ))
          ) : allCalls.length > 0 ? (
            <div className="p-2 space-y-1">
              {allCalls.map(call => (
                <CallHistoryItem key={call.id} call={call} currentUserId={authUser!.id} onCall={startCall} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-4">
              <PhoneMissed className="w-16 h-16 mb-4" />
              <p className="text-lg font-semibold">No recent calls</p>
              <p className="text-sm">You haven't made or received any calls yet.</p>
              <Button className="mt-6" onClick={() => router.push('/search')}>
                <Phone className="mr-2 h-4 w-4" /> Start a call
              </Button>
            </div>
          )}
        </main>
      </SwipeablePageWrapper>
       <Button 
          variant="default" 
          size="icon" 
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-xl bg-gradient-bharatconnect-bubble text-primary-foreground hover:opacity-90 transition-opacity z-30" 
          aria-label="New call" 
          onClick={() => router.push('/search')}
        >
        <Phone className="w-7 h-7" />
      </Button>
      <BottomNavigationBar />
    </div>
  );
}
