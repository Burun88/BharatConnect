
"use client";

import { useEffect } from 'react';

export default function DynamicVhSetter() {
  useEffect(() => {
    const updateVh = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };

    window.addEventListener('resize', updateVh);
    updateVh(); // Initial call

    return () => window.removeEventListener('resize', updateVh);
  }, []);

  return null;
}
