
"use client";

import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface HomeHeaderProps {
  isHeaderContentLoaded: boolean;
}

const HomeHeader: FC<HomeHeaderProps> = ({ isHeaderContentLoaded }) => {
  const { toast } = useToast();

  const showComingSoonToast = () => {
    toast({
      title: "Hold Tight, Connecting Soon! 🚀",
      description: "Our team is busy crafting this awesome feature for you. It'll be ready before your next chai break! Stay tuned with BharatConnect! 🇮🇳✨",
    });
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between p-4 bg-background z-20 h-16",
        "fixed top-0 left-0 right-0",
        "transition-transform duration-300 ease-in-out",
        isHeaderContentLoaded ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <Logo
        size="medium"
        className={cn(
          "transition-all duration-300 ease-in-out"
          // No longer need individual animation based on isHeaderContentLoaded, parent handles it
        )}
      />
      <div
        className={cn(
          "flex items-center space-x-2 transition-all duration-300 ease-in-out"
          // No longer need individual animation based on isHeaderContentLoaded, parent handles it
        )}
      >
        <Button 
          variant="ghost" 
          size="icon" 
          aria-label="Search" 
          tabIndex={isHeaderContentLoaded ? 0 : -1}
          onClick={showComingSoonToast}
        >
          <Search className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default HomeHeader;
