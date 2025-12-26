import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import ClientThemeProvider from '@/components/ClientThemeProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import AgeVerificationModal from '@/components/AgeVerificationModal';
import GlobalHeader from '@/components/GlobalHeader';
import { IMProvider } from '@/components/im';
import { NotiesProvider } from '@/components/noties';
import { MessagesProvider } from '@/components/messages';

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
        <meta name="description" content="One link. Every live. Group live streaming platform." />
        <meta name="application-name" content="MyLiveLinks" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MyLiveLinks" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#8b5cf6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="msapplication-TileColor" content="#8b5cf6" />
        <meta name="msapplication-TileImage" content="/branding/favicon/icon-144x144.png" />
        
        <link rel="icon" href="/branding/favicon/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/branding/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/branding/favicon/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/branding/favicon/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/branding/favicon/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/branding/favicon/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/branding/favicon/icon-167x167.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ClientThemeProvider>
            <NotiesProvider>
              <MessagesProvider>
                <GlobalHeader />
                <AgeVerificationModal />
                <IMProvider />
                {children}
              </MessagesProvider>
            </NotiesProvider>
          </ClientThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
