"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { firestore } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { CallDocument } from '@/types';
import IncomingCallModal from './IncomingCallModal';
import { useToast } from '@/hooks/use-toast';

export default function IncomingCallManager() {
  const { authUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [incomingCall, setIncomingCall] = useState<CallDocument | null>(null);

  useEffect(() => {
    if (!authUser?.id) return;

    const callsRef = collection(firestore, 'calls');
    const q = query(
      callsRef,
      where('calleeId', '==', authUser.id),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        setIncomingCall({ id: callDoc.id, ...callDoc.data() } as CallDocument);
      } else {
        setIncomingCall(null);
      }
    });

    return () => unsubscribe();
  }, [authUser?.id]);

  const handleAccept = () => {
    if (!incomingCall) return;
    router.push(`/call/${incomingCall.id}`);
    setIncomingCall(null);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    const callDoc = doc(firestore, 'calls', incomingCall.id);
    await updateDoc(callDoc, { status: 'declined', endedAt: serverTimestamp() });
    toast({
        title: "Call Declined",
        description: `You declined the call from ${incomingCall.callerName}.`
    });
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <IncomingCallModal 
      call={incomingCall} 
      onAccept={handleAccept} 
      onDecline={handleDecline} 
    />
  );
}
