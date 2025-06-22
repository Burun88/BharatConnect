
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from "@/components/page-header";
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { firestore, serverTimestamp, Timestamp } from '@/lib/firebase'; 
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection } from 'firebase/firestore'; 
import type { StatusMediaItem, UserStatusDoc } from '@/types';
import { Send, Loader2 } from 'lucide-react';

const STATUS_DURATION_MS = 60 * 60 * 1000; // 1 hour
const MAX_CHARS = 280;

export default function CreateTextStatusPage() {
  const router = useRouter();
  const { authUser, isAuthenticated, isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [statusText, setStatusText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [charCount, setCharCount] = useState(0);
  

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    if (text.length <= MAX_CHARS) {
      setStatusText(text);
      setCharCount(text.length);
    }
  };

  const handlePostStatus = async () => {
    if (!authUser || !authUser.id) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'User not fully identified. Please try logging out and back in.' });
      console.error("[CreateTextStatusPage] handlePostStatus called but authUser or authUser.id is missing or null.", authUser);
      setIsPosting(false); 
      return;
    }

    const trimmedStatusText = statusText.trim();
    if (trimmedStatusText === '') {
      toast({ variant: 'destructive', title: 'Error', description: 'Status text cannot be empty.' });
      return;
    }
    if (trimmedStatusText.length > MAX_CHARS) {
        toast({ variant: 'destructive', title: 'Error', description: `Status text cannot exceed ${MAX_CHARS} characters.` });
        return;
    }

    setIsPosting(true);

    const newMediaItem: StatusMediaItem = {
      id: doc(collection(firestore, '_')).id, 
      type: 'text',
      textContent: trimmedStatusText,
      createdAt: Timestamp.now(), 
    };

    const statusDocRef = doc(firestore, 'status', authUser.id);

    try {
      const docSnap = await getDoc(statusDocRef);
      const now = Date.now();
      const newExpiresAt = Timestamp.fromMillis(now + STATUS_DURATION_MS);

      if (docSnap.exists()) {
        const existingData = docSnap.data() as UserStatusDoc;
        if (existingData.expiresAt && (existingData.expiresAt as Timestamp).toMillis() > now && existingData.isActive === true) {
          // Updating existing active status: Add new media, update timestamps, AND RESET VIEWERS
          const updatePayload: Partial<UserStatusDoc> = { // Use Partial for clarity on what's changing
            media: arrayUnion(newMediaItem) as any, // Cast to any due to arrayUnion complexity with types
            lastMediaTimestamp: serverTimestamp(), 
            expiresAt: newExpiresAt, 
            isActive: true,
            viewers: [], // Reset viewers so the status appears as "new" for everyone, including self
          };
          console.log("[CreateTextStatusPage DEBUG] Attempting to UPDATE status. UID:", authUser.id);
          console.log("[CreateTextStatusPage DEBUG] Update Payload (raw):", updatePayload);
          await updateDoc(statusDocRef, updatePayload);
        } else {
          // Creating new status because existing one is expired/inactive
          const newStatusDocPayload: UserStatusDoc = {
            userId: authUser.id,
            createdAt: serverTimestamp(), 
            expiresAt: newExpiresAt,
            media: [newMediaItem],
            viewers: [], // Initially empty viewers list
            isActive: true,
            lastMediaTimestamp: serverTimestamp(), 
          };
          console.log("[CreateTextStatusPage DEBUG] Attempting to CREATE (setDoc) new status (existing doc found but inactive/expired). UID:", authUser.id);
          console.log("[CreateTextStatusPage DEBUG] New Status Doc Payload (raw):", newStatusDocPayload);
          await setDoc(statusDocRef, newStatusDocPayload);
        }
      } else {
        // Creating new status document for the first time
        const newStatusDocPayload: UserStatusDoc = {
          userId: authUser.id,
          createdAt: serverTimestamp(),
          expiresAt: newExpiresAt,
          media: [newMediaItem],
          viewers: [], // Initially empty viewers list
          isActive: true,
          lastMediaTimestamp: serverTimestamp(),
        };
        console.log("[CreateTextStatusPage DEBUG] Attempting to CREATE (setDoc) new status (doc did not exist). UID:", authUser.id);
        console.log("[CreateTextStatusPage DEBUG] New Status Doc Payload (raw):", newStatusDocPayload);
        await setDoc(statusDocRef, newStatusDocPayload);
      }

      toast({ title: 'Status Posted!', description: 'Your text status is now live for 1 hour.' });
      router.push('/status');
    } catch (error: any) {
      console.error("Error posting status:", error);
      toast({ variant: 'destructive', title: 'Post Failed', description: error.message || 'Could not post status.' });
    } finally {
      setIsPosting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-gradient-to-br from-primary via-accent to-secondary">
      <PageHeader title="Create Text Status" className="bg-transparent border-b-white/20 text-primary-foreground [&_h1]:text-primary-foreground [&_button]:text-primary-foreground [&_button:hover]:bg-white/10" />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl bg-background/80 backdrop-blur-md">
          <CardContent className="p-6 pt-8 space-y-4">
            <Textarea
              placeholder="What's on your mind?"
              value={statusText}
              onChange={handleTextChange}
              className="min-h-[150px] text-lg bg-card border-border focus:ring-primary resize-none custom-scrollbar-dark"
              maxLength={MAX_CHARS}
            />
            <div className="text-right text-sm text-muted-foreground">
              {charCount}/{MAX_CHARS}
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/50 p-4">
            <Button
              onClick={handlePostStatus}
              className="w-full text-base py-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground"
              disabled={isPosting || statusText.trim() === ''}
            >
              {isPosting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Send className="mr-2 h-5 w-5" />
              )}
              {isPosting ? 'Posting...' : 'Post Status'}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

    