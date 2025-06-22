"use client";

import { cn } from '@/lib/utils';

export default function TypingIndicatorBubble() {
  return (
    <div className={cn("flex items-center space-x-1.5 p-2.5 max-w-max message-bubble-incoming", "animate-fade-in-scale-up")}>
      <span className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
      <span className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
      <span className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-pulse"></span>
    </div>
  );
}
