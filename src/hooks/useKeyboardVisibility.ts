
"use client";

import { useState, useEffect, useCallback } from 'react';

export function useKeyboardVisibility(): { isKeyboardVisible: boolean; keyboardHeight: number } {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const handleResize = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const currentLayoutViewportHeight = vv.height;
    // Approximate keyboard height. This might need adjustments based on OS/browser.
    // A common heuristic is if the visual viewport height is significantly less than the window inner height.
    const estimatedKeyboardHeight = window.innerHeight - currentLayoutViewportHeight - vv.offsetTop;
    
    // Threshold to consider keyboard "effectively" open. 75px is arbitrary, adjust as needed.
    const keyboardIsActuallyVisible = estimatedKeyboardHeight > 75;

    setIsKeyboardVisible(keyboardIsActuallyVisible);
    setKeyboardHeight(keyboardIsActuallyVisible ? Math.max(0, estimatedKeyboardHeight) : 0);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize); // Some mobile browsers trigger scroll on keyboard
    
    // Initial check
    handleResize();

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, [handleResize]);

  return { isKeyboardVisible, keyboardHeight };
}
