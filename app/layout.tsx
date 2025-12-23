import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import ClientThemeProvider from '@/components/ClientThemeProvider';

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
        <meta name="description" content="Group live streaming platform" />
        <link rel="icon" href="/branding/favicon/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/branding/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/branding/favicon/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/branding/favicon/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <ClientThemeProvider>
          {children}
        </ClientThemeProvider>
      </body>
    </html>
  );
}


