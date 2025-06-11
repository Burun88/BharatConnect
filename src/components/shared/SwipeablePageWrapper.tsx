
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
  // const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null); // Not directly used for animation classes on current page anymore

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (isTransitioning) return;

    // Check if the touch target or its parents have data-no-page-swipe
    let targetElement = e.target as HTMLElement;
    let disablePageSwipe = false;
    if (wrapperRef.current) { // Ensure wrapperRef.current exists before checking parentage
        while (targetElement && targetElement !== wrapperRef.current) {
            if (targetElement.dataset.noPageSwipe === 'true') {
            disablePageSwipe = true;
            break;
            }
            if (!targetElement.parentElement) break; // Stop if no parent
            targetElement = targetElement.parentElement as HTMLElement;
        }
        // Check the wrapperRef.current itself if the loop didn't find it (e.g., touch on direct child)
        if (!disablePageSwipe && targetElement === wrapperRef.current && targetElement.dataset.noPageSwipe === 'true') {
             disablePageSwipe = true;
        }
    }


    if (disablePageSwipe) {
      touchStartXRef.current = null; // Effectively disable page swipe for this touch
      touchEndXRef.current = null;
      return;
    }

    touchStartXRef.current = e.targetTouches[0].clientX;
    touchEndXRef.current = null; // Reset endX
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (isTransitioning || touchStartXRef.current === null) return; // Also check if page swipe is disabled for this touch
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (isTransitioning || touchStartXRef.current === null || touchEndXRef.current === null) {
      // If touchStartXRef is null, it means page swipe was disabled for this touch sequence.
      // Reset start and end for the next potential touch, but don't process a swipe.
      touchStartXRef.current = null;
      touchEndXRef.current = null;
      return;
    }

    const deltaX = touchEndXRef.current - touchStartXRef.current;
    const currentIndex = navItems.findIndex(item => {
        if (item.href === '/') return pathname === '/';
        return pathname.startsWith(item.href);
    });

    if (currentIndex === -1) {
        touchStartXRef.current = null;
        touchEndXRef.current = null;
        return; 
    }

    let targetPath: string | null = null;
    let detectedSwipeDirection: 'left' | 'right' | null = null;

    if (deltaX > SWIPE_THRESHOLD) { 
      if (currentIndex > 0) {
        targetPath = navItems[currentIndex - 1].href;
        detectedSwipeDirection = 'right';
      }
    } else if (deltaX < -SWIPE_THRESHOLD) { 
      if (currentIndex < navItems.length - 1) {
        targetPath = navItems[currentIndex + 1].href;
        detectedSwipeDirection = 'left';
      }
    }
    
    touchStartXRef.current = null;
    touchEndXRef.current = null;

    if (targetPath && detectedSwipeDirection) {
      setIsTransitioning(true);
      if (wrapperRef.current) {
        const directionClass = detectedSwipeDirection === 'right' ? 'swipe-out-right' : 'swipe-out-left';
        wrapperRef.current.classList.add(directionClass);
      }
      
      // Store swipe direction for next page's animation
      // This part is tricky and often better handled by state management or animation libraries
      // For a simple approach, we could try using sessionStorage or history.state
      // if (typeof window !== 'undefined') {
      //   const nextState = { ...window.history.state, incomingSwipeDirection: detectedSwipeDirection === 'left' ? 'right' : 'left' };
      //   window.history.pushState(nextState, '', targetPath); // This changes URL, which might not be what router.push does
      // }


      setTimeout(() => {
        router.push(targetPath!);
      }, SWIPE_ANIMATION_DURATION / 2); 
    }
  };
  
  useEffect(() => {
    setIsTransitioning(false);
    // setSwipeDirection(null); // Keep for potential future use
    if (wrapperRef.current) {
        wrapperRef.current.classList.remove('swipe-out-left', 'swipe-out-right', 'swipe-in-left', 'swipe-in-right');
    }

    // Attempt to apply incoming animation based on history state (experimental)
    // This logic is more complex to get right reliably without a dedicated animation library
    // if (typeof window !== 'undefined' && window.history.state && window.history.state.incomingSwipeDirection) {
    //   const incomingDirection = window.history.state.incomingSwipeDirection;
    //   if (wrapperRef.current) {
    //     if (incomingDirection === 'left') wrapperRef.current.classList.add('swipe-in-left');
    //     if (incomingDirection === 'right') wrapperRef.current.classList.add('swipe-in-right');
    //   }
    //   // Clear the state to prevent re-animation on refresh
    //   const { incomingSwipeDirection, ...newState } = window.history.state;
    //   window.history.replaceState(newState, '');
    // }


  }, [pathname]);


  return (
    <div
      ref={wrapperRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn(
        "swipeable-page-content", 
        className
      )}
      style={{ touchAction: 'pan-y' }} 
    >
      {children}
    </div>
  );
}

