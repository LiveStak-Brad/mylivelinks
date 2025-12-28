import { ReactNode } from 'react';

export default function AnalyticsLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Inherits admin protection from parent /owner layout
  return children;
}






