
"use client";

import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeHeaderProps {
  isHeaderContentLoaded: boolean;
}

const HomeHeader: FC<HomeHeaderProps> = ({ isHeaderContentLoaded }) => {
  return (
    <header
      className={cn(
        "flex items-center justify-between p-4 bg-background z-20 h-16",
        "fixed top-0 left-0 right-0"
        // The header bar itself is always visible and fixed.
        // Animations apply to its children.
      )}
    >
      <Logo
        size="medium"
        className={cn(
          "transition-all duration-300 ease-in-out",
          isHeaderContentLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
        )}
      />
      <div
        className={cn(
          "flex items-center space-x-2",
          "transition-all duration-300 ease-in-out",
          isHeaderContentLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
        )}
      >
        <Button variant="ghost" size="icon" aria-label="Search" disabled={!isHeaderContentLoaded}>
          <Search className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default HomeHeader;
