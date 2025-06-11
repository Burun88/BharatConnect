
"use client";

import React, { useRef, useState, type TouchEvent, type ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { navItems } from '@/components/bottom-navigation-bar'; // Import navItems
import { cn } from '@/lib/utils';

interface SwipeablePageWrapperProps {
  children: ReactNode;
  className?: string;
}

const SWIPE_THRESHOLD = 50; // Minimum pixels for a swipe
const SWIPE_ANIMATION_DURATION = 300; // ms

export default function SwipeablePageWrapper({ children, className }: SwipeablePageWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (isTransitioning) return;
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchEndXRef.current = null; // Reset endX
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (isTransitioning || touchStartXRef.current === null) return;
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (isTransitioning || touchStartXRef.current === null || touchEndXRef.current === null) {
      touchStartXRef.current = null;
      touchEndXRef.current = null;
      return;
    }

    const deltaX = touchEndXRef.current - touchStartXRef.current;
    const currentIndex = navItems.findIndex(item => {
        // Handle root path '/' specially for 'Chats'
        if (item.href === '/') return pathname === '/';
        return pathname.startsWith(item.href);
    });

    if (currentIndex === -1) {
        touchStartXRef.current = null;
        touchEndXRef.current = null;
        return; // Current path not in navItems
    }

    let targetPath: string | null = null;

    if (deltaX > SWIPE_THRESHOLD) { // Swipe Right (previous page)
      if (currentIndex > 0) {
        targetPath = navItems[currentIndex - 1].href;
        setSwipeDirection('right');
      }
    } else if (deltaX < -SWIPE_THRESHOLD) { // Swipe Left (next page)
      if (currentIndex < navItems.length - 1) {
        targetPath = navItems[currentIndex + 1].href;
        setSwipeDirection('left');
      }
    }
    
    touchStartXRef.current = null;
    touchEndXRef.current = null;

    if (targetPath) {
      setIsTransitioning(true);
      // Apply animation class before navigation
      if (wrapperRef.current) {
        const directionClass = deltaX > 0 ? 'swipe-out-right' : 'swipe-out-left';
        wrapperRef.current.classList.add(directionClass);
      }

      setTimeout(() => {
        router.push(targetPath!);
        // Note: We can't easily control the incoming page's animation from here
        // without a more complex layout-level animation system.
        // Resetting transition state is now handled by useEffect on pathname change.
      }, SWIPE_ANIMATION_DURATION / 2); // Navigate midway through animation
    }
  };
  
  // Reset transition state when path changes (new page loads)
  useEffect(() => {
    setIsTransitioning(false);
    setSwipeDirection(null);
    if (wrapperRef.current) {
        wrapperRef.current.classList.remove('swipe-out-left', 'swipe-out-right', 'swipe-in-left', 'swipe-in-right');
    }
  }, [pathname]);


  // Determine initial animation for incoming page
  // This is a simplified approach. More robust solutions use libraries like Framer Motion.
  let initialAnimationClass = '';
  if (typeof window !== 'undefined' && window.history.state && window.history.state.swipeDirection) {
      if (window.history.state.swipeDirection === 'left') {
          initialAnimationClass = 'swipe-in-left';
      } else if (window.history.state.swipeDirection === 'right') {
          initialAnimationClass = 'swipe-in-right';
      }
      // Clear it so it doesn't re-apply on refresh
      const { swipeDirection, ...newStateWithoutSwipe } = window.history.state;
      window.history.replaceState(newStateWithoutSwipe, '');
  }


  return (
    <div
      ref={wrapperRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn(
        "swipeable-page-content", // Base class for transitions
        initialAnimationClass,
        className
      )}
      style={{ touchAction: 'pan-y' }} // Allow vertical scroll, prioritize horizontal for swipe
    >
      {children}
    </div>
  );
}
