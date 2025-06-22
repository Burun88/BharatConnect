
"use client";

import { useEffect } from 'react';

export default function DynamicVhSetter() {
  useEffect(() => {
    // Function to update the --vh custom property
    const updateVh = () => {
      if (window.visualViewport) {
        // Use the visualViewport's height for a more accurate representation of the visible area,
        // which accounts for the virtual keyboard.
        document.documentElement.style.setProperty('--vh', `${window.visualViewport.height * 0.01}px`);
      } else {
        // Fallback for older browsers or environments where visualViewport is not supported.
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      }
    };

    // Check if visualViewport is supported before adding the event listener
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateVh);
      updateVh(); // Initial call

      // Cleanup function
      return () => window.visualViewport?.removeEventListener('resize', updateVh);
    } else {
      // Fallback event listener
      window.addEventListener('resize', updateVh);
      updateVh(); // Initial call

      // Cleanup function for the fallback
      return () => window.removeEventListener('resize', updateVh);
    }
  }, []);

  return null;
}
