
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/page-header';
import type { UserAura, LocalUserProfile } from '@/types';
import { AURA_OPTIONS } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Sparkles, XCircle } from 'lucide-react';

export default function AuraSelectPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [userProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);
  const [isGuardLoading, setIsGuardLoading] = useState(true);
  
  const [currentUserAuraId, setCurrentUserAuraId] = useLocalStorage<string | null>('currentUserAuraId', null); // This LS item might be independent or tied to userProfileLs
  const [selectedAuraId, setSelectedAuraId] = useState<string | null>(currentUserAuraId);
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    // Simplified guard logic as Firebase auth is removed
    if (!userProfileLs || !userProfileLs.uid || !userProfileLs.onboardingComplete) {
      console.log(`[AuraSelectPage] User from LS not found or not fully onboarded. Redirecting to login.`);
      router.replace('/login');
      return;
    }
    setIsGuardLoading(false);
  }, [userProfileLs, router]);

  useEffect(() => {
    if (isGuardLoading) return;
    setSelectedAuraId(currentUserAuraId);
    setIsPageLoading(false);
  }, [currentUserAuraId, isGuardLoading]);

  const handleSelectAura = (aura: UserAura) => {
    setSelectedAuraId(aura.id);
    setCurrentUserAuraId(aura.id); // This will update the LS for 'currentUserAuraId'
    // If you want this tied to the main userProfileLs, you'd update that LS object instead/additionally
    toast({
      title: 'Aura Updated!',
      description: `You are now feeling ${aura.name} ${aura.emoji}`,
    });
    router.back(); 
  };

  const handleClearAura = () => {
    setSelectedAuraId(null);
    setCurrentUserAuraId(null);
    toast({
      title: 'Aura Cleared',
      description: 'Your aura has been reset.',
    });
    router.back(); 
  };

  if (isGuardLoading || isPageLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-muted-foreground">Loading Auras...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="Select Your Aura" />
      <main className="flex-grow p-4 overflow-auto">
        <div className="mb-4 p-3 bg-accent/20 border border-accent/50 rounded-lg flex items-start space-x-2">
          <Sparkles className="w-5 h-5 text-accent mt-0.5 shrink-0" />
          <p className="text-sm text-accent-foreground">
            Your Aura reflects your current mood to your contacts. Choose one that best describes how you're feeling!
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {AURA_OPTIONS.map((aura) => (
            <Card
              key={aura.id}
              onClick={() => handleSelectAura(aura)}
              className={cn(
                "cursor-pointer hover:shadow-lg transition-all duration-200 ease-in-out transform hover:-translate-y-1",
                selectedAuraId === aura.id ? 'ring-2 ring-primary shadow-primary/50' : 'ring-1 ring-border',
                aura.gradient ? `border-transparent ${aura.gradient}` : ''
              )}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSelectAura(aura)}
              role="button"
              aria-pressed={selectedAuraId === aura.id}
              aria-label={`Select ${aura.name} aura`}
            >
              <CardContent className={cn(
                "flex flex-col items-center justify-center p-4 h-32",
                 aura.gradient ? 'bg-background/80 backdrop-blur-sm rounded-[calc(var(--radius)-1px)]' : ''
                )}>
                <span className="text-4xl mb-2">{aura.emoji}</span>
                <p className="text-sm font-medium text-foreground">{aura.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {selectedAuraId && (
          <Button
            variant="outline"
            className="w-full mt-6 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleClearAura}
          >
            <XCircle className="mr-2 h-4 w-4" /> Clear Aura
          </Button>
        )}
      </main>
    </div>
  );
}
