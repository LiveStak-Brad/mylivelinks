import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Central - MyLiveLinks',
  description: 'Join live broadcasts. Meet new people. Get paid. Watch up to 12 creators streaming live at once!',
  
  openGraph: {
    type: 'website',
    url: 'https://www.mylivelinks.com/live',
    title: 'Live Central - MyLiveLinks 🔴',
    description: 'Join live broadcasts. Meet new people. Get paid. Watch up to 12 creators streaming live at once!',
    images: [
      {
        url: 'https://www.mylivelinks.com/livecentralmeta.png',
        width: 1200,
        height: 630,
        alt: 'Live Central - MyLiveLinks',
        type: 'image/png',
      },
    ],
    siteName: 'MyLiveLinks',
  },
  
  twitter: {
    card: 'summary_large_image',
    site: '@MyLiveLinks',
    title: 'Live Central - MyLiveLinks 🔴',
    description: 'Join live broadcasts. Meet new people. Get paid. Watch up to 12 creators streaming live at once!',
    images: ['https://www.mylivelinks.com/livecentralmeta.png'],
  },
};

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

