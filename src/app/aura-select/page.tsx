
"use client";

import React, { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
// import Image from 'next/image'; // No longer using next/image directly for the avatar here
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import shadcn Avatar components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/contexts/AuthContext';
import type { UserAura, FirestoreAura, DisplayAura } from '@/types'; 
import { AURA_OPTIONS } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { firestore, serverTimestamp, Timestamp } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { Loader2, Trash2, CheckCircle, Sparkles, AlertCircle, UserCircle2 } from 'lucide-react'; // Added UserCircle2
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const AURA_DURATION_MS = 60 * 60 * 1000; // 1 hour

export default function AuraSelectPage() {
  const router = useRouter();
  const { authUser, isAuthenticated, isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [currentUserActiveAura, setCurrentUserActiveAura] = useState<DisplayAura | null>(null);
  
  const [isSavingAura, setIsSavingAura] = useState(false);
  const [isLoadingAuraStatus, setIsLoadingAuraStatus] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [processingAuraId, setProcessingAuraId] = useState<string | null>(null);


  useEffect(() => {
    if (!authUser?.id || !authUser.name) { // Removed authUser.avatarUrl from dependency as it's part of authUser
      setIsLoadingAuraStatus(false);
      setCurrentUserActiveAura(null);
      setPageError(isAuthenticated ? "User data incomplete for aura check." : null);
      return;
    }
    setPageError(null);
    setIsLoadingAuraStatus(true);
    const auraDocRef = doc(firestore, 'auras', authUser.id);

    console.log(`[AuraSelectPage] Setting up listener for auras/${authUser.id}`);

    const unsubscribe = onSnapshot(auraDocRef, (docSnap) => {
      console.log(`[AuraSelectPage] Snapshot received for auras/${authUser.id}. Exists: ${docSnap.exists()}`);
      if (docSnap.exists()) {
        const data = docSnap.data() as FirestoreAura;
        console.log(`[AuraSelectPage] Document data:`, data);

        let createdAtDate: Date | null = null;
        if (data.createdAt && typeof (data.createdAt as Timestamp).toDate === 'function') {
          createdAtDate = (data.createdAt as Timestamp).toDate();
        } else if (data.createdAt && typeof data.createdAt === 'object' && 'seconds' in data.createdAt && 'nanoseconds' in data.createdAt) {
          createdAtDate = new Timestamp((data.createdAt as any).seconds, (data.createdAt as any).nanoseconds).toDate();
        } else {
           console.warn(`[AuraSelectPage] createdAt field is missing or not a Firestore Timestamp for doc ${docSnap.id}`);
        }

        if (createdAtDate && (new Date().getTime() - createdAtDate.getTime() < AURA_DURATION_MS)) {
          const auraStyle = AURA_OPTIONS.find(opt => opt.id === data.auraOptionId);
          if (!auraStyle) {
            console.warn(`[AuraSelectPage] Aura option ID "${data.auraOptionId}" not found in AURA_OPTIONS.`);
          }
          setCurrentUserActiveAura({
            id: docSnap.id, 
            userId: data.userId,
            auraOptionId: data.auraOptionId,
            createdAt: createdAtDate.getTime(), 
            userName: authUser.name || 'User', 
            userProfileAvatarUrl: authUser.avatarUrl, 
            auraStyle: auraStyle || null, 
          });
          console.log(`[AuraSelectPage] Active aura set for user ${data.userId}:`, data.auraOptionId);
        } else {
          setCurrentUserActiveAura(null);
          console.log(`[AuraSelectPage] Aura for user ${data.userId} is expired or createdAt invalid. createdAtDate: ${createdAtDate}`);
        }
      } else {
        setCurrentUserActiveAura(null);
        console.log(`[AuraSelectPage] No active aura document found for user ${authUser.id}.`);
      }
      setIsLoadingAuraStatus(false);
    }, (error) => {
      console.error("[AuraSelectPage] Error listening to user's aura:", error);
      toast({ variant: "destructive", title: "Aura Status Error", description: "Could not load your aura status." });
      setPageError("Failed to listen to aura status. Check console for errors.");
      setIsLoadingAuraStatus(false);
      setCurrentUserActiveAura(null);
    });

    return () => {
      console.log(`[AuraSelectPage] Unsubscribing listener for auras/${authUser.id}`);
      unsubscribe();
    };
  }, [authUser, isAuthenticated, toast]); // authUser itself is the dependency


  const handleSetAura = async (selectedAuraOption: UserAura) => {
    if (!authUser?.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated.' });
      return;
    }
    setProcessingAuraId(selectedAuraOption.id); 
    setIsSavingAura(true);
    try {
      const auraData: FirestoreAura = {
        userId: authUser.id,
        auraOptionId: selectedAuraOption.id,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(firestore, 'auras', authUser.id), auraData);
      
      toast({ title: 'Aura Set!', description: `Your ${selectedAuraOption.name} aura is now active. It will be visible shortly.` });
      router.push('/');
    } catch (error: any) {
      console.error('Error setting aura:', error);
      toast({ variant: 'destructive', title: 'Aura Update Failed', description: error.message || 'Could not set your aura.' });
    } finally {
      setIsSavingAura(false);
      setProcessingAuraId(null);
    }
  };

  const handleClearAura = async () => {
    if (!authUser?.id || !currentUserActiveAura) return;
    setIsSavingAura(true);
    try {
      await deleteDoc(doc(firestore, 'auras', authUser.id));
      toast({ title: 'Aura Cleared', description: 'Your aura has been removed.' });
    } catch (error: any) {
      console.error('Error clearing aura:', error);
      toast({ variant: 'destructive', title: 'Aura Clear Failed', description: error.message || 'Could not clear your aura.' });
    } finally {
      setIsSavingAura(false);
    }
  };

  if (isAuthLoading || isLoadingAuraStatus) {
    return (
      <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground text-center">Loading Aura Setup...</p>
      </div>
    );
  }
  if (!isAuthenticated || !authUser) {
    // router.replace('/login'); // AuthContext handles redirection
    return (
      <div className="flex h-[calc(var(--vh)*100)] bg-background items-center justify-center">
        <p className="text-muted-foreground text-center">Redirecting...</p>
      </div>
    );
  }

  if (pageError) {
    return (
        <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
            <PageHeader title="Aura Error" />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 flex items-center justify-center hide-scrollbar">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Aura Information</AlertTitle>
                    <AlertDescription>
                        {pageError} Please try again later or contact support if the issue persists.
                        You can go back to the <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/')}>Homepage</Button>.
                    </AlertDescription>
                </Alert>
            </main>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
      <PageHeader title={currentUserActiveAura ? "Your Active Aura" : "Set Your Aura"} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 hide-scrollbar">
        {currentUserActiveAura && (
          <Card className="w-full max-w-md mx-auto shadow-xl bg-card">
             <CardHeader className="text-center items-center pt-6">
                <div className="relative w-32 h-32 mx-auto"> 
                  {currentUserActiveAura.auraStyle?.gradient && (
                    <div
                      className={cn(
                        "absolute inset-0 rounded-full", 
                        currentUserActiveAura.auraStyle.gradient
                      )}
                    />
                  )}
                  <div 
                    className={cn(
                      "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[124px] h-[124px] rounded-full overflow-hidden", 
                      currentUserActiveAura.auraStyle?.gradient && "bg-background p-0.5" 
                    )}
                  >
                    <Avatar className="w-full h-full">
                      <AvatarImage 
                        src={currentUserActiveAura.userProfileAvatarUrl || undefined} 
                        alt={`${currentUserActiveAura.userName}'s profile`} 
                        data-ai-hint="person avatar"
                      />
                      <AvatarFallback className="bg-muted">
                        <UserCircle2 className="w-20 h-20 text-muted-foreground" /> 
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {currentUserActiveAura.auraStyle?.emoji && ( 
                      <div className="absolute bottom-[-16px] left-1/2 transform -translate-x-1/2 w-8 h-8 bg-muted rounded-full flex items-center justify-center border-2 border-card shadow-md">
                          <span className="text-base">{currentUserActiveAura.auraStyle.emoji}</span>
                      </div>
                  )}
                </div>
                <CardTitle className="text-2xl mt-4"> 
                     {currentUserActiveAura.auraStyle?.name || 'Your Aura'}
                </CardTitle>
                <CardDescription>Active until {new Date(currentUserActiveAura.createdAt + AURA_DURATION_MS).toLocaleTimeString()}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={handleClearAura} variant="destructive" className="w-full" disabled={isSavingAura}>
                  {isSavingAura ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Clear Aura
              </Button>
            </CardContent>
          </Card>
        )}
        
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
            <CardTitle className="text-xl flex items-center"><Sparkles className="w-5 h-5 mr-2 text-primary"/>
                {currentUserActiveAura ? "Change Your Aura Vibe" : "Choose Your Aura Vibe"}
            </CardTitle>
            <CardDescription>Select an aura that best represents your current mood or status.</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {AURA_OPTIONS.map(option => (
                <Button
                    key={option.id}
                    variant={currentUserActiveAura?.auraOptionId === option.id ? "default" : "outline"}
                    className={cn(
                    "h-auto p-3 flex flex-col items-center justify-center space-y-2 rounded-lg transition-all duration-150 transform hover:scale-105",
                    currentUserActiveAura?.auraOptionId === option.id && "ring-2 ring-primary shadow-lg",
                    (isSavingAura && processingAuraId === option.id) && "opacity-50 cursor-not-allowed",
                    (currentUserActiveAura?.auraOptionId === option.id && option.gradient) 
                        ? `text-primary-foreground border-transparent ${option.gradient}` 
                        : (option.gradient ? `text-primary-foreground border-transparent ${option.gradient}` : "bg-card hover:bg-muted/50")
                    )}
                    onClick={() => handleSetAura(option)}
                    disabled={isSavingAura && processingAuraId === option.id}
                >
                    {isSavingAura && processingAuraId === option.id ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                    <>
                        <span className="text-3xl">{option.emoji}</span>
                        <span className="text-xs font-medium">{option.name}</span>
                    </>
                    )}
                </Button>
                ))}
            </div>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
