
"use client";

import type { User } from '@/types';
import { AURA_OPTIONS } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, UserCircle2 } from 'lucide-react'; // Added UserCircle2
import React from 'react';
import { useToast } from '@/hooks/use-toast';

interface AuraItemProps {
  user: User;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

const AuraItemComponent = ({ user, isCurrentUser = false, onClick }: AuraItemProps) => {
  const aura = AURA_OPTIONS.find(a => a.id === user.currentAuraId);
  const { toast } = useToast();

  const showComingSoonToast = () => {
    toast({
      title: "Hold Tight, Connecting Soon! 🚀",
      description: "This user's aura details will be available soon. Stay tuned with BharatConnect! 🇮🇳✨",
    });
  };

  const handleItemClick = () => {
    if (onClick) {
      onClick();
    } else if (!isCurrentUser) {
      showComingSoonToast();
    }
  };

  const IMAGE_SIZE_CLASS = "w-[72px] h-[72px]";
  const mainElementSize = "w-20 h-20";

  const smallCircleSize = "w-6 h-6";
  const smallCircleIconSize = "w-3.5 h-3.5";
  const smallCircleEmojiFontSize = "text-xs";
  const emojiOverlapTopClass = "top-[66px]";


  const ItemContainer: React.FC<{ children: React.ReactNode; 'aria-label': string }> = ({ children, ...props }) => (
    <div
      className="flex flex-col items-center space-y-2 text-center p-1 shrink-0 cursor-pointer" // Reduced space-y-3 to space-y-2
      onClick={handleItemClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleItemClick()}
      aria-label={props['aria-label']}
    >
      {children}
    </div>
  );

  const AvatarWithOverlap: React.FC<{
    avatarContent: React.ReactNode;
    overlapContent?: React.ReactNode;
    isRing?: boolean;
    ringGradient?: string;
  }> = ({ avatarContent, overlapContent, isRing, ringGradient }) => {
    return (
      <div className={cn("relative", mainElementSize)}>
        {isRing && ringGradient && (
          <div
            className={cn(
              "absolute inset-0 rounded-full animate-spin-slow",
              ringGradient
            )}
          />
        )}
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden",
            IMAGE_SIZE_CLASS,
            isRing && "bg-background p-px" 
          )}
        >
          {React.cloneElement(avatarContent as React.ReactElement, {
            className: cn((avatarContent as React.ReactElement).props.className, "w-full h-full"),
          })}
        </div>

        {overlapContent && (
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center border-2 border-background",
              smallCircleSize,
              emojiOverlapTopClass,
              aura?.gradient ? 'bg-card' : 'bg-primary'
            )}
          >
            {overlapContent}
          </div>
        )}
      </div>
    );
  };


  const nameText = (
    <span className={cn("text-xs text-foreground truncate text-center", `w-20`)}>
      {isCurrentUser ? (aura ? "Your Aura" : "My Aura") : user.name}
    </span>
  );

  const currentUserAvatar = (
    <Avatar className={IMAGE_SIZE_CLASS}>
      {user.avatarUrl ? (
        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
      ) : (
        <AvatarFallback className={cn(aura?.gradient ? "bg-transparent" : "bg-card text-card-foreground", "flex items-center justify-center")}>
           <UserCircle2 className="w-12 h-12" /> {/* Used UserCircle2 icon */}
        </AvatarFallback>
      )}
    </Avatar>
  );

  const otherUserAvatar = ( // Kept initials for other users as per typical chat app behavior
    <Avatar className={IMAGE_SIZE_CLASS}>
        {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
        ) : (
            <AvatarFallback className={cn(aura?.gradient ? "bg-transparent" : "bg-card text-card-foreground")}>
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
            </AvatarFallback>
        )}
    </Avatar>
  );


  if (isCurrentUser && !aura) {
    return (
      <ItemContainer aria-label="Set your story or aura">
        <AvatarWithOverlap
          isRing={false}
          avatarContent={
             <Avatar className={IMAGE_SIZE_CLASS}>
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
              ) : (
                <AvatarFallback className={cn("bg-card text-card-foreground", "flex items-center justify-center")}>
                  <UserCircle2 className="w-12 h-12" /> {/* Used UserCircle2 icon */}
                </AvatarFallback>
              )}
            </Avatar>
          }
          overlapContent={
            <div className={cn("w-full h-full rounded-full flex items-center justify-center")}>
              <Plus className={cn(smallCircleIconSize, "text-primary-foreground")} />
            </div>
          }
        />
        {nameText}
      </ItemContainer>
    );
  }

  if (aura) {
    return (
      <ItemContainer aria-label={`${user.name} - ${aura.name} aura`}>
        <AvatarWithOverlap
          isRing
          ringGradient={aura.gradient}
          avatarContent={isCurrentUser ? currentUserAvatar : otherUserAvatar}
          overlapContent={
            <div className={cn("w-full h-full rounded-full flex items-center justify-center")}>
              <span className={smallCircleEmojiFontSize}>{aura.emoji}</span>
            </div>
          }
        />
        {nameText}
      </ItemContainer>
    );
  }

  // Fallback for other users without an aura (will trigger toast on click)
  return (
    <ItemContainer aria-label={user.name}>
       <div className={cn("relative", mainElementSize)}>
         <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden",
            IMAGE_SIZE_CLASS
          )}>
            <Avatar className={IMAGE_SIZE_CLASS}>
              {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
              ) : ( // Kept initials for other users as per typical chat app behavior
                  <AvatarFallback className="bg-card text-card-foreground">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
                  </AvatarFallback>
              )}
            </Avatar>
          </div>
           <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2",
              smallCircleSize,
              emojiOverlapTopClass,
              "invisible" // Keep this to maintain layout consistency for items without an emoji overlap
            )}
          />
      </div>
      {nameText}
    </ItemContainer>
  );
}

const AuraItem = React.memo(AuraItemComponent);
export default AuraItem;
