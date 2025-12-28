'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = (searchParams?.get('ref') || '').trim();
    if (ref) {
      router.replace(`/signup?ref=${encodeURIComponent(ref)}`);
      return;
    }

    router.replace('/signup');
  }, [router, searchParams]);

  return null;
}
