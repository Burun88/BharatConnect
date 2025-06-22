
import type { Metadata, Viewport } from 'next';
import './globals.css';
import ClientProviders from '@/components/ClientProviders';

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
  interactiveWidget: 'resizes-content',
  viewportFit: 'cover', // Ensure viewport-fit=cover is present
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased h-full bg-background">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
