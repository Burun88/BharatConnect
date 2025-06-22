
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from "@/components/page-header";
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { firestore, serverTimestamp, Timestamp } from '@/lib/firebase'; 
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection } from 'firebase/firestore'; 
import type { StatusMediaItem, UserStatusDoc } from '@/types';
import { Send, Loader2, Palette, CaseSensitive } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CHARS = 280;

export default function CreateTextStatusPage() {
  const router = useRouter();
  const { authUser, isAuthenticated, isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [statusText, setStatusText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [charCount, setCharCount] = useState(0);
  
  // Customization State
  const [backgrounds] = useState([
    'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600',
    'bg-gradient-to-br from-green-400 to-blue-500',
    'bg-gradient-to-br from-yellow-400 via-red-500 to-pink-500',
    'bg-gradient-to-br from-gray-700 via-gray-900 to-black',
    'bg-gradient-to-br from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90%',
    'bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500',
  ]);
  const [fonts] = useState([
    'font-sans',
    'font-serif',
    'font-mono',
  ]);
  const [selectedBgIndex, setSelectedBgIndex] = useState(0);
  const [selectedFontIndex, setSelectedFontIndex] = useState(0);

  const selectedBg = backgrounds[selectedBgIndex];
  const selectedFont = fonts[selectedFontIndex];

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

  const cycleBackground = () => {
    setSelectedBgIndex((prevIndex) => (prevIndex + 1) % backgrounds.length);
  };

  const cycleFont = () => {
    setSelectedFontIndex((prevIndex) => (prevIndex + 1) % fonts.length);
  };

  const handlePostStatus = async () => {
    if (!authUser || !authUser.id) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'User not fully identified. Please try logging out and back in.' });
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
      backgroundColor: selectedBg,
      fontStyle: selectedFont,
      viewers: [], // Initialize viewers for this specific item
    };

    const statusDocRef = doc(firestore, 'status', authUser.id);

    try {
      const docSnap = await getDoc(statusDocRef);
      const now = Date.now();
      const newExpiresAt = Timestamp.fromMillis(now + STATUS_DURATION_MS);

      if (docSnap.exists() && docSnap.data().isActive === true && (docSnap.data().expiresAt as Timestamp).toMillis() > now) {
        // If an active status document exists, just add the new media and update timestamps.
        // DO NOT reset viewers.
        await updateDoc(statusDocRef, {
          media: arrayUnion(newMediaItem),
          lastMediaTimestamp: serverTimestamp(),
          expiresAt: newExpiresAt,
        });
      } else {
        // If no active status doc, create a new one.
        // The `viewers` field is no longer at this top level.
        const newStatusDocPayload: UserStatusDoc = {
          userId: authUser.id,
          createdAt: serverTimestamp(),
          expiresAt: newExpiresAt,
          media: [newMediaItem],
          isActive: true,
          lastMediaTimestamp: serverTimestamp(),
        };
        await setDoc(statusDocRef, newStatusDocPayload);
      }

      toast({ title: 'Status Posted!', description: 'Your text status is now live for 24 hours.' });
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
    <div className={cn("flex flex-col h-[calc(var(--vh)*100)] transition-all duration-500", selectedBg)}>
      <PageHeader title="Create Text Status" className="bg-transparent border-b-white/20 text-primary-foreground [&_h1]:text-primary-foreground [&_button]:text-primary-foreground [&_button:hover]:bg-white/10" />
      <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-md flex flex-col items-center justify-center flex-1 min-h-0">
          <Textarea
            placeholder="What's on your mind?"
            value={statusText}
            onChange={handleTextChange}
            className={cn(
              "w-full flex-1 bg-transparent text-white border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-3xl text-center shadow-lg font-bold resize-none flex items-center justify-center placeholder:text-white/70 hide-scrollbar",
              selectedFont
            )}
            maxLength={MAX_CHARS}
          />
          <div className="text-right text-sm text-white/80 w-full mt-2 shrink-0">
            {charCount}/{MAX_CHARS}
          </div>
        </div>
        <div className="w-full max-w-md shrink-0 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/20" onClick={cycleBackground}>
                    <Palette className="w-5 h-5"/>
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/20" onClick={cycleFont}>
                    <CaseSensitive className="w-5 h-5"/>
                </Button>
            </div>
            <Button
              onClick={handlePostStatus}
              className="h-14 w-14 rounded-full bg-white text-black hover:bg-gray-200"
              disabled={isPosting || statusText.trim() === ''}
              aria-label="Post Status"
            >
              {isPosting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Send className="h-6 w-6" />
              )}
            </Button>
        </div>
      </main>
    </div>
  );
}
