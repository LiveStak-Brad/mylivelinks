import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import '@/styles/linkler.css';
import ClientThemeProvider from '@/components/ClientThemeProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import AgeVerificationModal from '@/components/AgeVerificationModal';
import NavigationWrapper from '@/components/NavigationWrapper';
import { GlobalLiveFloatingButton } from '@/components/LiveFloatingButton';
import PullToRefresh from '@/components/PullToRefresh';
import { IMProvider } from '@/components/im';
import { NotiesProvider } from '@/components/noties';
import { MessagesProvider } from '@/components/messages';
import { ToastProvider } from '@/components/ui';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { PresenceHeartbeat } from '@/components/presence/PresenceHeartbeat';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>MyLiveLinks - One link. Every live.</title>
        <meta name="description" content="Share your links, make posts, go live, and get paid! Join the MyLiveLinks community." />
        <meta name="application-name" content="MyLiveLinks" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MyLiveLinks" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#8b5cf6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="msapplication-TileColor" content="#8b5cf6" />
        <meta name="msapplication-TileImage" content="/androidpwa-144.png" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="MyLiveLinks" />
        <meta property="og:title" content="MyLiveLinks - One link. Every live." />
        <meta property="og:description" content="Share your links, make posts, go live, and get paid! Join the MyLiveLinks community." />
        <meta property="og:image" content="/mylivelinksmeta.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MyLiveLinks - One link. Every live." />
        <meta name="twitter:description" content="Share your links, make posts, go live, and get paid! Join the MyLiveLinks community." />
        <meta name="twitter:image" content="/mylivelinksmeta.png" />
        
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ClientThemeProvider>
            <ToastProvider>
              <PresenceProvider>
                <PresenceHeartbeat />
                <NotiesProvider>
                  <MessagesProvider>
                    <Suspense fallback={null}>
                      <NavigationWrapper />
                    </Suspense>
                    <PullToRefresh />
                    <GlobalLiveFloatingButton />
                    <AgeVerificationModal />
                    <IMProvider />
                    {/* Note: Pages should wrap content in PageShell which provides <main id="main">
                        for skip-link accessibility. If not using PageShell, ensure you have a 
                        <main id="main" tabIndex={-1}> landmark element. */}
                    {children}
                  </MessagesProvider>
                </NotiesProvider>
              </PresenceProvider>
            </ToastProvider>
          </ClientThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
