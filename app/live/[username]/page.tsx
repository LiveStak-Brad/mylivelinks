'use client';

import { use } from 'react';
import SoloStreamViewer from '@/components/SoloStreamViewer';
import LiveRoomErrorBoundary from '@/components/LiveRoomErrorBoundary';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default function SoloStreamPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const username = decodeURIComponent(resolvedParams.username);

  return (
    <LiveRoomErrorBoundary>
      <SoloStreamViewer username={username} />
    </LiveRoomErrorBoundary>
  );
}

