'use client';

import SoloStreamViewer from '@/components/SoloStreamViewer';
import LiveRoomErrorBoundary from '@/components/LiveRoomErrorBoundary';

interface PageProps {
  params: { username: string };
}

export default function SoloStreamPage({ params }: PageProps) {
  const username = decodeURIComponent(params.username);

  return (
    <LiveRoomErrorBoundary>
      <SoloStreamViewer username={username} />
    </LiveRoomErrorBoundary>
  );
}
