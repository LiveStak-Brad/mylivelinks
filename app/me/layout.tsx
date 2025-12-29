import { ReactNode } from 'react';

/* =============================================================================
   USER SETTINGS LAYOUT
   
   Route: /me/*
   
   Purpose: Layout wrapper for user-specific settings and analytics pages
   
   Provides consistent navigation and layout for all /me/* routes:
   - /me/analytics (existing)
   - Future: /me/settings, /me/privacy, etc.
============================================================================= */

export default function MeLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Simple pass-through layout for now
  // The individual pages (like /me/analytics) handle their own layouts
  // This ensures the route structure is properly recognized by Next.js
  
  return <>{children}</>;
}
