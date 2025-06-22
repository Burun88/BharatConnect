'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAndSaveFcmToken, setupForegroundMessageListener } from '@/services/notificationService';

export default function FCMHandler() {
  const { authUser, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only run if the user is authenticated
    if (isAuthenticated && authUser?.id) {
      getAndSaveFcmToken(authUser.id);
    }
  }, [isAuthenticated, authUser?.id]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Set up the foreground message listener
      const unsubscribe = setupForegroundMessageListener();

      // Clean up the listener when the component unmounts
      return () => {
        unsubscribe();
      };
    }
  }, []);

  return null; // This component does not render anything
}
