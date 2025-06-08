
"use client";

import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeHeaderProps {
  isHeaderVisible: boolean;
  // onSearchClick: () => void; // Add if search functionality is implemented
}

const HomeHeader: FC<HomeHeaderProps> = ({ isHeaderVisible }) => {
  return (
    <header
      className={cn(
        "flex items-center justify-between p-4 bg-background z-10 h-16 sticky top-0",
        "transition-transform duration-200 ease-in-out",
        isHeaderVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <Logo size="medium" />
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" aria-label="Search" /* onClick={onSearchClick} */>
          <Search className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default HomeHeader;
