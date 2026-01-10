import Link from 'next/link';
import type { Metadata } from 'next';

import { PolicyFooter } from '@/components/PolicyFooter';

export const metadata: Metadata = {
  title: 'User Data Deletion | MyLiveLinks',
  description: 'Instructions for requesting deletion of your MyLiveLinks account data.',
  robots: { index: true, follow: true },
};

export default function DataDeletionPage() {
  return (
    <main id="main" tabIndex={-1} className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-3xl">
            <Link href="/policies" className="text-sm font-medium text-primary hover:underline">
              Back to All Policies
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground">User Data Deletion</h1>

          <div className="mt-10 space-y-6 text-foreground leading-7">
            <p>
              If you created a MyLiveLinks account using Facebook Login and would like to request deletion of your data, please contact us at:
            </p>
            
            <p className="text-lg">
              <a href="mailto:brad@mylivelinks.com" className="text-primary hover:underline font-medium">
                brad@mylivelinks.com
              </a>
            </p>

            <p>
              In your request, include the email address associated with your MyLiveLinks account.
            </p>

            <p>
              We will delete your account data within a reasonable timeframe in accordance with applicable laws.
            </p>
          </div>
        </div>
      </div>

      <PolicyFooter />
    </main>
  );
}
