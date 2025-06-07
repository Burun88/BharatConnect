"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, showBackButton = true, actions, className }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className={cn("flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10 h-16", className)}>
      <div className="flex items-center gap-2">
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-xl font-semibold text-foreground truncate">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
