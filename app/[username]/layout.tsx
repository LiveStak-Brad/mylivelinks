'use client';

import { ReactNode } from 'react';
import { useParams } from 'next/navigation';

/* =============================================================================
   PROFILE LAYOUT
   
   Shared layout for user profile pages (/[username], /[username]/feed, /[username]/photos).
   
   Provides:
   - Consistent spacing and typography
   - Seamless transitions between profile sections
   
   NOTE: GlobalHeader is rendered in root layout.tsx, NOT here.
   Profile navigation tabs are now handled within the profile page itself.
============================================================================= */

export default function ProfileLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const username = params.username as string;

  return (
    <main id="main" tabIndex={-1} className="outline-none">
      {children}
    </main>
  );
}
