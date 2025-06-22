
"use client";

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { UserCircle2, Eye, Mail, Quote, X, Check, Send, Trash2, MessageSquareX } from 'lucide-react';
import type { User, Chat } from '@/types';
import { useRouter } from 'next/navigation'; // Added router import

interface ChatRequestDisplayProps {
  chatDetails: Chat;
  contact: User;
  currentUserId: string;
  onAcceptRequest: () => Promise<void>;
  onRejectRequest: () => Promise<void>;
  onCancelRequest: () => Promise<void>;
  isProcessing: boolean; // Added isProcessing prop
}

export default function ChatRequestDisplay({
  chatDetails,
  contact,
  currentUserId,
  onAcceptRequest,
  onRejectRequest,
  onCancelRequest,
  isProcessing, // Use the passed prop
}: ChatRequestDisplayProps) {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  // const [isProcessing, setIsProcessing] = useState(false); // Remove local state
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'cancel' | null>(null);
  const router = useRouter(); // Initialize router


  const isRequestView = chatDetails.requestStatus === 'awaiting_action' && chatDetails.requesterId !== currentUserId;
  const isPendingSenderView = chatDetails.requestStatus === 'pending' && chatDetails.requesterId === currentUserId;
  const isRejectedView = chatDetails.requestStatus === 'rejected';

  const handleAction = async (action: 'accept' | 'reject' | 'cancel') => {
    // setIsProcessing(true); // Parent now controls this
    setActionType(action);
    try {
      if (action === 'accept') await onAcceptRequest();
      else if (action === 'reject') await onRejectRequest();
      else if (action === 'cancel') await onCancelRequest();
    } finally {
      // Parent handles processing state and navigation
      // setActionType(null); // Can be reset by parent or here if needed
    }
  };
  
  const commonCardClasses = "w-full max-w-md rounded-xl shadow-2xl overflow-hidden bg-card";

  if (isRequestView) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-background">
        <Card className={commonCardClasses}>
          <CardHeader className="text-center pt-6 pb-2">
            <p className="text-sm text-muted-foreground mb-2">
              {contact.name} wants to connect with you.
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16 rounded-full border-2 border-border shadow-md">
                <AvatarImage src={contact.avatarUrl || undefined} alt={contact.name} data-ai-hint="person avatar" />
                <AvatarFallback className="bg-muted"><UserCircle2 className="w-10 h-10 text-muted-foreground" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground truncate">{contact.name}</h3>
                {contact.username && <p className="text-xs text-muted-foreground truncate">@{contact.username}</p>}
                <Button variant="link" size="sm" className="px-0 h-auto text-primary hover:text-primary/80 -ml-0.5 mt-0.5" onClick={() => setIsProfileDialogOpen(true)}>
                  <Eye className="w-3.5 h-3.5 mr-1" /> View Profile
                </Button>
              </div>
            </div>
            {chatDetails.firstMessageTextPreview && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Their message:</p>
                <div className="relative text-sm italic p-4 bg-muted/50 rounded-lg shadow-inner border border-border/50 break-words">
                  <Quote className="absolute top-2 left-2 w-4 h-4 text-muted-foreground/50 transform -scale-x-100" />
                  <p className="ml-2">{chatDetails.firstMessageTextPreview}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center pt-2">Accept this chat request to start messaging.</p>
          </CardContent>
          <CardFooter className="grid grid-cols-2 gap-3 p-4 bg-card border-t border-border">
            <Button variant="outline" onClick={() => handleAction('reject')} className="w-full py-3 text-base border-muted-foreground/50 text-muted-foreground hover:bg-muted hover:text-foreground" disabled={isProcessing}>
              {isProcessing && actionType === 'reject' ? <svg className="animate-spin mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <X className="mr-2 h-4 w-4" />}
              {isProcessing && actionType === 'reject' ? "Ignoring..." : "Ignore"}
            </Button>
            <Button onClick={() => handleAction('accept')} className="w-full py-3 text-base bg-green-600 hover:bg-green-700 text-primary-foreground" disabled={isProcessing}>
              {isProcessing && actionType === 'accept' ? <svg className="animate-spin mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Check className="mr-2 h-4 w-4" />}
              {isProcessing && actionType === 'accept' ? "Accepting..." : "Accept"}
            </Button>
          </CardFooter>
        </Card>

        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle className="text-center text-xl">{contact.name}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={contact.avatarUrl || undefined} alt={contact.name} data-ai-hint="person avatar"/>
                  <AvatarFallback className="bg-muted"><UserCircle2 className="w-12 h-12 text-muted-foreground" /></AvatarFallback>
                </Avatar>
                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-foreground">{contact.name}</h3>
                  {contact.username && <p className="text-sm text-muted-foreground">@{contact.username}</p>}
                </div>
              </div>
              {contact.bio && (<div><h4 className="text-xs font-medium text-muted-foreground mb-1">BIO</h4><p className="text-sm text-foreground bg-muted/30 p-3 rounded-md shadow-inner">{contact.bio}</p></div>)}
              {contact.email && (<div><h4 className="text-xs font-medium text-muted-foreground mb-1">EMAIL</h4><div className="flex items-center space-x-2 p-2.5 rounded-md border bg-muted/30 text-muted-foreground"><Mail className="w-4 h-4" /><span className="text-sm text-foreground">{contact.email}</span></div></div>)}
            </div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isPendingSenderView) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-background">
        <Card className={commonCardClasses}>
          <CardHeader className="items-center text-center pt-8 pb-4"><Send className="w-12 h-12 text-amber-500 mb-3" /><CardTitle className="text-2xl font-semibold text-amber-600">Request Sent</CardTitle></CardHeader>
          <CardContent className="text-center p-6 pt-0">
            <p className="text-sm text-muted-foreground">Your message request to {contact.name} is pending. You can chat once accepted.</p>
            {chatDetails.firstMessageTextPreview && (<p className="text-sm text-muted-foreground italic mt-4 p-3 bg-muted/50 rounded-lg shadow-inner break-words">&ldquo;{chatDetails.firstMessageTextPreview}&rdquo;</p>)}
          </CardContent>
          <CardFooter className="flex-col space-y-3 p-6 border-t border-border">
            <Button variant="destructive" onClick={() => handleAction('cancel')} className="w-full py-3 text-base" disabled={isProcessing}>
               {isProcessing && actionType === 'cancel' ? <svg className="animate-spin mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Trash2 className="mr-2 h-4 w-4" />}
              {isProcessing && actionType === 'cancel' ? "Cancelling..." : "Cancel Request"}
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full py-3 text-base" disabled={isProcessing}>Back to Chats</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (isRejectedView) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-background">
        <Card className={commonCardClasses}>
          <CardHeader className="items-center text-center pt-8 pb-4"><MessageSquareX className="w-12 h-12 text-destructive mb-3" /><CardTitle className="text-2xl font-semibold text-destructive">{chatDetails.requesterId === currentUserId ? "Request Not Accepted" : "Request Ignored"}</CardTitle></CardHeader>
          <CardContent className="text-center p-6 pt-0">{chatDetails.requesterId === currentUserId ? <p className="text-sm text-muted-foreground">{contact.name} has not accepted your chat request.</p> : <p className="text-sm text-muted-foreground">You ignored the chat request from {contact.name}.</p>}</CardContent>
          <CardFooter className="p-6 border-t border-border"><Button variant="outline" onClick={() => router.push('/')} className="w-full py-3 text-base">Back to Chats</Button></CardFooter>
        </Card>
      </div>
    );
  }

  return null; 
}

