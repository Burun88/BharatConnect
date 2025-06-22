
"use client";

import { useState, useEffect, type RefObject } from 'react';

export function useElementHeight(elementRef: RefObject<HTMLElement>): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setHeight(entry.target.offsetHeight);
      }
    });

    observer.observe(element);
    // Initial height
    setHeight(element.offsetHeight);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [elementRef]);

  return height;
}
