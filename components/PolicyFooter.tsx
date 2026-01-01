'use client';

import Link from 'next/link';

import { POLICIES } from '@/shared/policies';

export function PolicyFooter() {
  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="container mx-auto px-4 py-6 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href="/policies" className="hover:text-foreground">
            Policies
          </Link>
          {POLICIES.map((policy) => (
            <Link key={policy.id} href={`/policies/${policy.id}`} className="hover:text-foreground">
              {policy.title}
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center">© 2026 MyLiveLinks. All rights reserved.</div>
      </div>
    </footer>
  );
}

