"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/page-header';
import type { UserAura } from '@/types';
import { AURA_OPTIONS } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Sparkles, XCircle } from 'lucide-react';

export default function AuraSelectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUserAuraId, setCurrentUserAuraId] = useLocalStorage<string | null>('currentUserAuraId', null);
  const [selectedAuraId, setSelectedAuraId] = useState<string | null>(currentUserAuraId);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSelectedAuraId(currentUserAuraId);
    setIsLoading(false);
  }, [currentUserAuraId]);

  const handleSelectAura = (aura: UserAura) => {
    setSelectedAuraId(aura.id);
    setCurrentUserAuraId(aura.id);
    toast({
      title: 'Aura Updated!',
      description: `You are now feeling ${aura.name} ${aura.emoji}`,
    });
    router.back(); // Or router.push('/')
  };

  const handleClearAura = () => {
    setSelectedAuraId(null);
    setCurrentUserAuraId(null);
    toast({
      title: 'Aura Cleared',
      description: 'Your aura has been reset.',
    });
    router.back(); // Or router.push('/')
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader title="Select Your Aura" />
        <main className="flex-grow p-4 overflow-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: AURA_OPTIONS.length }).map((_, index) => (
              <Card key={index} className="animate-pulse bg-muted h-32" />
            ))}
          </div>
          <Button className="w-full mt-6 animate-pulse bg-muted h-10" disabled>
            Clear Aura
          </Button>
        </main>
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
