'use client';

import { app, firestore } from '@/lib/firebase';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;

export const getAndSaveFcmToken = async (uid: string): Promise<void> => {
  if (!VAPID_KEY) {
    console.error("FCM VAPID key is not set in environment variables.");
    return;
  }
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn("Push notifications are not supported in this browser.");
    return;
  }

  try {
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) {
        console.log('[FCM] Token retrieved:', currentToken);
        await setDoc(doc(firestore, "bharatConnectUsers", uid), { fcmToken: currentToken }, { merge: true });
      } else {
        console.log('[FCM] No registration token available. Request permission to generate one.');
      }
    } else {
      console.warn('[FCM] Notification permission not granted.');
    }
  } catch (error) {
    console.error("[FCM] An error occurred while retrieving token:", error);
  }
};

export const setupForegroundMessageListener = () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const messaging = getMessaging(app);
      const unsubscribe = onMessage(messaging, (payload) => {
          console.log('[FCM] Foreground message received:', payload);
          toast({
              title: payload.notification?.title || "New Message",
              description: payload.notification?.body || "Check your chats.",
          });
      });
      return unsubscribe;
  }
  return () => {}; // Return an empty function if messaging is not supported
};
