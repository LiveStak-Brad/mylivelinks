import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import ClientThemeProvider from '@/components/ClientThemeProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import AgeVerificationModal from '@/components/AgeVerificationModal';
import NavigationWrapper from '@/components/NavigationWrapper';
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
        <meta name="description" content="Share your links, make posts, go live, and get paid! Join the MyLiveLinks community." />
        <meta name="application-name" content="MyLiveLinks" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MyLiveLinks" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#8b5cf6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="msapplication-TileColor" content="#8b5cf6" />
        <meta name="msapplication-TileImage" content="/branding/favicon/icon-144x144.png" />
        
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
                <NavigationWrapper />
                <AgeVerificationModal />
                <IMProvider />
                {/* Note: Pages should wrap content in PageShell which provides <main id="main">
                    for skip-link accessibility. If not using PageShell, ensure you have a 
                    <main id="main" tabIndex={-1}> landmark element. */}
                {children}
              </MessagesProvider>
            </NotiesProvider>
          </ClientThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
