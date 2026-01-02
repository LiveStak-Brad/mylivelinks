'use client';

import { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';

export interface TeamAdminShellProps {
  children: ReactNode;
}

export default function TeamAdminShell({ children }: TeamAdminShellProps) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">{children}</div>
    </ToastProvider>
  );
}
