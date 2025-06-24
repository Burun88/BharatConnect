
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, Loader2, AlertCircle, UserCircle2, Play, Pause, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserStatusDoc, StatusMediaItem, User as BharatConnectUser } from '@/types';
import { firestore, Timestamp } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { getUserFullProfile } from '@/services/profileService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_ITEM_DURATION_MS = 5000;
const PROGRESS_UPDATE_INTERVAL_MS = 50;

export default function StatusViewPage() {
  const router = useRouter();
  const params = useParams();
  const statusOwnerId = params.userId as string;

  const { authUser, isAuthenticated, isAuthContextLoading } = useAuth();

  const [statusDoc, setStatusDoc] = useState<UserStatusDoc | null>(null);
  const [statusOwnerProfile, setStatusOwnerProfile] = useState<BharatConnectUser | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);
  const isMountedRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);

  const [viewerProfiles, setViewerProfiles] = useState<BharatConnectUser[]>([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  const [isViewersSheetOpen, setIsViewersSheetOpen] = useState(false);
  
  const initialIndexSetRef = useRef(false);

  const isMyStatus = useMemo(() => statusOwnerId === authUser?.id, [statusOwnerId, authUser?.id]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
  
  const handleSheetOpenChange = (isOpen: boolean) => {
    setIsViewersSheetOpen(isOpen);
    setIsPlaying(!isOpen); 
  };

  const currentMediaItem = useMemo(() => {
    if (statusDoc && statusDoc.media && currentMediaIndex >= 0 && currentMediaIndex < (statusDoc.media.length)) {
      return statusDoc.media[currentMediaIndex];
    }
    return null;
  }, [statusDoc, currentMediaIndex]);

  useEffect(() => {
    if (isViewersSheetOpen && isMyStatus) {
      const fetchViewers = async () => {
        if (!currentMediaItem?.viewers || currentMediaItem.viewers.length === 0) {
          setViewerProfiles([]);
          return;
        }
        
        setIsLoadingViewers(true);
        try {
          const profiles = await Promise.all(
            currentMediaItem.viewers.map(uid => getUserFullProfile(uid))
          );
          if (isMountedRef.current) {
            setViewerProfiles(profiles.filter(p => p !== null) as BharatConnectUser[]);
          }
        } catch (err) {
          console.error("Failed to fetch viewer profiles", err);
        } finally {
          if (isMountedRef.current) {
            setIsLoadingViewers(false);
          }
        }
      };

      fetchViewers();
    }
  }, [isViewersSheetOpen, isMyStatus, currentMediaItem]);

  const numMediaItems = useMemo(() => statusDoc?.media?.length || 0, [statusDoc]);

  const updateLastViewedMedia = useCallback((mediaItemIdToStore: string | null) => {
    if (authUser?.id && statusOwnerId) {
      const lsKey = `bharatconnect-last-viewed-media-id-${statusOwnerId}-${authUser.id}`;
      if (mediaItemIdToStore) {
        localStorage.setItem(lsKey, mediaItemIdToStore);
      } else {
        localStorage.removeItem(lsKey);
      }
    }
  }, [authUser, statusOwnerId]);

  // Main effect to fetch status data and owner profile
  useEffect(() => {
    if (!statusOwnerId || isAuthContextLoading) {
      if (isMountedRef.current) setIsLoading(true);
      return;
    }
    if (!isAuthenticated) {
      if (isMountedRef.current) router.replace('/login');
      return;
    }

    let isEffectMounted = true;
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      setIsPlaying(true);
      initialIndexSetRef.current = false;
    }
    
    const statusDocRef = doc(firestore, 'status', statusOwnerId);
    
    const unsubscribe = onSnapshot(statusDocRef, async (statusSnap) => {
      if (!isEffectMounted || !isMountedRef.current) return;

      if (!statusOwnerProfile) {
        try {
            const profile = await getUserFullProfile(statusOwnerId);
            if (!isEffectMounted || !isMountedRef.current) return;
            if (!profile) {
                setError(`Profile not found for user ID: ${statusOwnerId}`);
                setIsLoading(false);
                return;
            }
            setStatusOwnerProfile(profile);
        } catch (err: any) {
            if (isMountedRef.current && isEffectMounted) setError(err.message || 'Failed to load profile.');
            setIsLoading(false);
            return;
        }
      }

      if (statusSnap.exists()) {
        const data = statusSnap.data() as UserStatusDoc;
        const isActiveNow = data.isActive === true && data.expiresAt && (data.expiresAt as Timestamp).toMillis() > Date.now() && data.media && data.media.length > 0;

        if (isActiveNow) {
          setStatusDoc(data);
          
          if (!initialIndexSetRef.current && authUser?.id) {
            let initialIndexToSet = 0;
            const lsKey = `bharatconnect-last-viewed-media-id-${statusOwnerId}-${authUser.id}`;
            const lastViewedMediaIdFromLS = localStorage.getItem(lsKey);

            if (lastViewedMediaIdFromLS && data.media && data.media.length > 0) {
              const lastViewedIdx = data.media.findIndex(item => item.id === lastViewedMediaIdFromLS);
              if (lastViewedIdx !== -1) {
                const potentialStartIndex = lastViewedIdx + 1;
                if (potentialStartIndex < data.media.length) {
                  initialIndexToSet = potentialStartIndex;
                } else {
                  initialIndexToSet = 0;
                }
              } else {
                localStorage.removeItem(lsKey);
                initialIndexToSet = 0;
              }
            }
            setCurrentMediaIndex(initialIndexToSet);
            initialIndexSetRef.current = true;
          }
        } else {
          setError('No active status found or status has expired.');
        }
      } else {
        setError('No status document found for this user.');
      }
      setIsLoading(false);
    }, (err) => {
        if (isMountedRef.current && isEffectMounted) setError(err.message || 'Failed to listen to status updates.');
        setIsLoading(false);
    });

    return () => { 
        isEffectMounted = false;
        unsubscribe();
    };
  }, [statusOwnerId, isAuthenticated, isAuthContextLoading, router, statusOwnerProfile]);
  
  // Effect to mark the current status item as viewed
  useEffect(() => {
    if (!statusDoc || !authUser?.id) return;
    
    const itemToUpdate = statusDoc.media?.[currentMediaIndex];
    if (itemToUpdate && !itemToUpdate.viewers?.includes(authUser.id)) {
        const statusDocRef = doc(firestore, 'status', statusOwnerId);
        
        const updatedMediaArray = statusDoc.media.map((item) => {
            if (item.id === itemToUpdate.id) {
                return { ...item, viewers: [...(item.viewers || []), authUser.id] };
            }
            return item;
        });

        updateDoc(statusDocRef, { media: updatedMediaArray })
            .catch(err => console.error("Error marking status item as viewed:", err));
    }
  }, [statusDoc, currentMediaIndex, authUser, statusOwnerId]);


  const advanceToNextMedia = useCallback(() => {
    const currentNumItems = statusDoc?.media?.length || 0;
    if (authUser?.id && statusOwnerId && statusDoc?.media && currentMediaIndex < currentNumItems && statusDoc.media[currentMediaIndex]) {
      updateLastViewedMedia(statusDoc.media[currentMediaIndex].id);
    }

    if (currentMediaIndex < currentNumItems - 1) {
      if (isMountedRef.current) setCurrentMediaIndex(prev => prev + 1);
    } else {
      if (isMountedRef.current) router.push('/status');
    }
  }, [currentMediaIndex, statusDoc, authUser, statusOwnerId, updateLastViewedMedia, router]);

  const regressToPreviousMedia = useCallback(() => {
    if (currentMediaIndex > 0) {
      if (isMountedRef.current) setCurrentMediaIndex(prev => prev - 1);
    }
  }, [currentMediaIndex]);

  useEffect(() => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    const currentNumItems = statusDoc?.media?.length || 0;

    if (!isPlaying || !statusDoc || currentNumItems === 0 || currentMediaIndex >= currentNumItems || !statusDoc.media[currentMediaIndex]) {
      return;
    }

    progressTimerRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        return;
      }
      setProgress(prevProgress => {
        const newProgress = prevProgress + (PROGRESS_UPDATE_INTERVAL_MS / STATUS_ITEM_DURATION_MS) * 100;
        if (newProgress >= 100) {
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          advanceToNextMedia();
          return 100;
        }
        return newProgress;
      });
    }, PROGRESS_UPDATE_INTERVAL_MS);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [currentMediaIndex, isPlaying, statusDoc, advanceToNextMedia]);

  useEffect(() => {
    if (isMountedRef.current) {
        setProgress(0);
        setIsPlaying(true);
    }
  }, [currentMediaIndex]);

  const handlePointerDown = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    isLongPressActiveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setIsPlaying(false);
      isLongPressActiveRef.current = true;
    }, 200);
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (isLongPressActiveRef.current && isMountedRef.current) {
        setIsPlaying(true);
    }
    isLongPressActiveRef.current = false;
  };

  const handleClose = () => {
    const currentNumItemsOnClose = statusDoc?.media?.length || 0;
    if (authUser?.id && statusOwnerId && statusDoc?.media && currentMediaIndex < currentNumItemsOnClose && statusDoc.media[currentMediaIndex]) {
        updateLastViewedMedia(statusDoc.media[currentMediaIndex].id);
    }
    if (isMountedRef.current) router.push('/status');
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    handlePointerDown();
    touchStartYRef.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    handlePointerUp();
    if (touchStartYRef.current && isMyStatus) {
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartYRef.current - touchEndY;
      if (deltaY > 50) {
        handleSheetOpenChange(true);
      }
    }
    touchStartYRef.current = null;
  };

  const handleTouchCancel = () => {
    handlePointerUp();
    touchStartYRef.current = null;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary-foreground" />
        <p className="mt-4 text-primary-foreground/80 text-center">Loading Status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4 z-50">
        <Alert variant="destructive" className="bg-background/10 backdrop-blur-sm border-destructive/50 text-destructive-foreground max-w-md">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertTitle className="text-destructive-foreground">Error Loading Status</AlertTitle>
          <AlertDescription className="text-destructive-foreground/80">{error}</AlertDescription>
        </Alert>
        <Button onClick={() => {if (isMountedRef.current) router.push('/status')}} variant="outline" className="mt-6 bg-transparent border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10">
          Go Back to Status
        </Button>
      </div>
    );
  }

  if (!statusDoc || !statusOwnerProfile || !currentMediaItem) {
     return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4 z-50">
        <Alert variant="destructive" className="bg-background/10 backdrop-blur-sm border-destructive/50 text-destructive-foreground max-w-md">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <AlertTitle className="text-destructive-foreground">Status Not Available</AlertTitle>
            <AlertDescription className="text-destructive-foreground/80">
            The status you are trying to view is no longer available or could not be loaded correctly.
            </AlertDescription>
        </Alert>
        <Button onClick={() => {if (isMountedRef.current) router.push('/status')}} variant="outline" className="mt-6 bg-transparent border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10">
            Go Back to Status
        </Button>
      </div>
    );
  }

  let mediaTime = "just now";
  const itemCreatedAt = currentMediaItem.createdAt;
  if (itemCreatedAt) {
    let date: Date;
    if (itemCreatedAt instanceof Timestamp) {
      date = itemCreatedAt.toDate();
    } else if (typeof itemCreatedAt === 'object' && 'seconds' in itemCreatedAt && 'nanoseconds' in itemCreatedAt) {
      date = new Timestamp((itemCreatedAt as any).seconds, (itemCreatedAt as any).nanoseconds).toDate();
    } else if (typeof itemCreatedAt === 'number') {
        date = new Date(itemCreatedAt);
    } else {
        date = new Date();
    }
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) mediaTime = "just now";
    else if (diffMins < 60) mediaTime = `${diffMins}m ago`;
    else mediaTime = `${Math.floor(diffMins / 60)}h ago`;
  }

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 p-0 overflow-hidden select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{ touchAction: 'pan-y' }}
    >
      <div className="absolute top-2 left-3 right-3 z-20 flex space-x-1 h-0.5">
        {statusDoc.media.map((_, index) => (
          <div key={index} className="flex-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white"
              style={{
                width: `${index < currentMediaIndex ? 100 : (index === currentMediaIndex ? progress : 0)}%`,
                transition: (index === currentMediaIndex && isPlaying && progress > 0) ? `width ${PROGRESS_UPDATE_INTERVAL_MS}ms linear` : 'none'
              }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-0 left-0 right-0 p-3 pt-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center space-x-2">
          <Avatar className="w-9 h-9 border-2 border-background/50">
            <AvatarImage src={statusOwnerProfile.avatarUrl || undefined} alt={statusOwnerProfile.name} data-ai-hint="person avatar"/>
            <AvatarFallback className="bg-muted"><UserCircle2 className="w-6 h-6 text-muted-foreground"/></AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-primary-foreground">{statusOwnerProfile.name}</p>
            <p className="text-xs text-primary-foreground/80">{mediaTime}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose} className="text-primary-foreground hover:bg-white/10">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="absolute top-0 left-0 h-full w-1/3 z-30" onClick={(e) => { e.stopPropagation(); if (!isLongPressActiveRef.current) regressToPreviousMedia(); }} />
      <div className="absolute top-0 right-0 h-full w-1/3 z-30" onClick={(e) => { e.stopPropagation(); if (!isLongPressActiveRef.current) advanceToNextMedia(); }} />

      <div className="flex-1 flex items-center justify-center w-full h-full max-h-screen z-0">
        {currentMediaItem.type === 'text' && (
          <div className={cn(
            "flex items-center justify-center p-8 text-center w-full h-full",
            currentMediaItem.backgroundColor || "bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600"
          )}>
            <p className={cn(
              "text-2xl md:text-3xl lg:text-4xl font-bold text-white shadow-lg break-words whitespace-pre-wrap",
              currentMediaItem.fontStyle || 'font-sans'
            )}>
              {currentMediaItem.textContent}
            </p>
          </div>
        )}
        {currentMediaItem.type === 'image' && currentMediaItem.url && (
          <div className="relative w-full h-full">
            <Image
              src={currentMediaItem.url}
              alt={`Status from ${statusOwnerProfile.name || 'User'}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority={currentMediaIndex === 0}
              data-ai-hint="status image"
            />
          </div>
        )}
         {currentMediaItem.type === 'image' && !currentMediaItem.url && (
            <div className="flex items-center justify-center w-full h-full bg-muted">
                <p className="text-muted-foreground">Image not available</p>
            </div>
        )}
      </div>

      {isMyStatus && (
        <Sheet open={isViewersSheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetTrigger asChild>
            <Button variant="ghost" className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center h-auto p-2 bg-black/30 text-white hover:bg-black/50 hover:text-white rounded-lg backdrop-blur-sm animate-fade-in-slide-up">
              <ChevronUp className="w-5 h-5" />
              <span className="text-xs font-semibold mt-1">{currentMediaItem?.viewers?.length || 0}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh] bg-background flex flex-col">
            <SheetHeader className="shrink-0">
              <SheetTitle>Viewed by</SheetTitle>
              <SheetDescription>
                {currentMediaItem?.viewers?.length || 0} contact{currentMediaItem?.viewers?.length !== 1 ? 's have' : ' has'} viewed your status.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 flex-grow overflow-y-auto custom-scrollbar-dark">
              {isLoadingViewers ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : viewerProfiles.length > 0 ? (
                <div className="space-y-1">
                  {viewerProfiles.map(viewer => (
                    <div key={viewer.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={viewer.avatarUrl || undefined} alt={viewer.name} />
                        <AvatarFallback><UserCircle2 className="w-6 h-6 text-muted-foreground" /></AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{viewer.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                   <p className="text-center text-muted-foreground">No viewers yet.</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {!isPlaying && isLongPressActiveRef.current && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 bg-black/50 text-white p-2 rounded-full">
          <Pause className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
