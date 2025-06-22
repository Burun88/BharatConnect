
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MoreVertical, UserCircle2, Phone, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getUserFullProfile } from '@/services/profileService';


interface ChatPageHeaderProps {
  contactName: string;
  contactId?: string; // Make contactId optional for safety
  contactAvatarUrl?: string | null;
  contactStatusText?: string;
  contactAuraIconUrl?: string | null;
  contactAuraName?: string | null;
  isChatActive: boolean;
  onMoreOptionsClick: () => void;
}

export default function ChatPageHeader({
  contactName,
  contactId,
  contactAvatarUrl,
  contactStatusText,
  contactAuraIconUrl,
  contactAuraName,
  isChatActive,
  onMoreOptionsClick,
}: ChatPageHeaderProps) {
  const router = useRouter();
  const { authUser } = useAuth();
  const { toast } = useToast();

  const handleCall = async (callType: 'audio' | 'video') => {
    if (!authUser || !contactId) {
      toast({
        title: "Cannot start call",
        description: "User or contact information is missing.",
        variant: "destructive"
      });
      return;
    }

    try {
      const contactProfile = await getUserFullProfile(contactId);
      if (!contactProfile) {
        throw new Error("Could not find contact's profile.");
      }

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
      console.error("Error initiating call:", error);
      toast({
        title: "Call Failed",
        description: error.message || "Could not start the call.",
        variant: "destructive"
      });
    }
  };


  return (
    <header className="flex items-center p-2.5 border-b bg-background h-16 shrink-0 sticky top-0 z-30">
      <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-1">
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <div className="relative mr-3">
        <Avatar className={cn("w-10 h-10")}>
          <AvatarImage src={contactAvatarUrl || undefined} alt={contactName} data-ai-hint="person avatar" />
          <AvatarFallback className="bg-muted text-muted-foreground">
            <UserCircle2 className="w-7 h-7 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-foreground truncate">{contactName}</h2>
        {isChatActive && contactStatusText && (
          <div className="flex items-center text-xs text-muted-foreground">
            <p className="truncate">{contactStatusText}</p>
            {contactAuraIconUrl && (
              <span className="ml-1.5 flex-shrink-0" title={contactAuraName || ''}>
                <Image src={contactAuraIconUrl} alt={contactAuraName || ''} width={16} height={16} className="w-4 h-4 object-contain" />
              </span>
            )}
          </div>
        )}
      </div>
      {isChatActive && contactId && (
          <div className="flex items-center ml-auto">
              <Button variant="ghost" size="icon" onClick={() => handleCall('audio')}>
                  <Phone className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleCall('video')}>
                  <Video className="w-5 h-5" />
              </Button>
          </div>
      )}
      <Button variant="ghost" size="icon" onClick={onMoreOptionsClick}>
        <MoreVertical className="w-5 h-5" />
      </Button>
    </header>
  );
}
