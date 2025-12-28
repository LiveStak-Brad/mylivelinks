'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function JoinRedirect() {
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

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinRedirect />
    </Suspense>
  );
}
