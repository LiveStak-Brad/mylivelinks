'use client';

import { useEffect } from 'react';

export default function InviteRedirectClient({ to }: { to: string }) {
  useEffect(() => {
    if (!to) return;
    try {
      window.location.replace(to);
    } catch {
      window.location.href = to;
    }
  }, [to]);

  return null;
}
