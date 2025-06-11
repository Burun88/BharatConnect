
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import DynamicVhSetter from '@/components/shared/DynamicVhSetter';
import FirebaseAuthObserver from '@/components/shared/FirebaseAuthObserver'; // Import the observer

export const metadata: Metadata = {
  title: 'BharatConnect',
  description: 'Intuitive and Secure Messaging for India',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // @ts-ignore
  virtualKeyboard: 'overlays-content', 
  interactiveWidget: 'resizes-visual', // Changed from resizes-content
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        {/* Viewport meta tag is now handled by Next.js 'viewport' export above */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full bg-background">
        <FirebaseAuthObserver /> {/* Add the observer here */}
        <DynamicVhSetter />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
