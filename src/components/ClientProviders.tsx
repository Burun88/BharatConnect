"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import FirebaseAuthObserver from '@/contexts/FirebaseAuthObserver';
import DynamicVhSetter from '@/components/shared/DynamicVhSetter';
import { Toaster } from '@/components/ui/toaster';
import SplashScreen from '@/components/shared/SplashScreen';
import FCMHandler from '@/components/shared/FCMHandler';
import IncomingCallManager from '@/components/call/IncomingCallManager';

interface ClientProvidersProps {
  children: ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); 

    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <ChatProvider>
        <FirebaseAuthObserver />
        <FCMHandler />
        <IncomingCallManager />
        <DynamicVhSetter />
        {showSplash && <SplashScreen />}
        {children}
        <Toaster />
      </ChatProvider>
    </AuthProvider>
  );
}
