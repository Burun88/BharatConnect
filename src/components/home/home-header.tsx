
"use client";

import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeHeaderProps {
  isHeaderContentLoaded: boolean; // This prop will now control the visibility of the entire header
}

const HomeHeader: FC<HomeHeaderProps> = ({ isHeaderContentLoaded }) => {
  return (
    <header
      className={cn(
        "flex items-center justify-between p-4 bg-background z-20 h-16",
        "fixed top-0 left-0 right-0",
        "transition-transform duration-300 ease-in-out", // Applied to the header itself
        isHeaderContentLoaded ? "translate-y-0" : "-translate-y-full" // Animate entire header
      )}
    >
      {/* Logo - no longer needs individual animation classes */}
      <Logo
        size="medium"
        className="transition-none" // Remove any individual transition if present
      />
      {/* Search Button container - no longer needs individual animation classes */}
      <div
        className="flex items-center space-x-2 transition-none" // Remove any individual transition if present
      >
        <Button variant="ghost" size="icon" aria-label="Search" tabIndex={isHeaderContentLoaded ? 0 : -1}>
          <Search className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default HomeHeader;
