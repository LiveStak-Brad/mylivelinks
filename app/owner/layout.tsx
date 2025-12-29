import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { OwnerPanelShell } from '@/components/owner/OwnerPanelShell';

export default async function OwnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : '';
    if (msg === 'UNAUTHORIZED') {
      redirect('/login');
    }

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">This area is restricted to owner/admin.</p>
          <a
            href="/"
            className="inline-flex px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Back to Site
          </a>
        </div>
      </div>
    );
  }

  return <OwnerPanelShell>{children}</OwnerPanelShell>;
}
