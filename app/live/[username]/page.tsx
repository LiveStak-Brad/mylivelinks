'use client';

import { useEffect } from 'react';
import SoloStreamViewer from '@/components/SoloStreamViewer';
import LiveRoomErrorBoundary from '@/components/LiveRoomErrorBoundary';

interface PageProps {
  params: { username: string };
}

export default function SoloStreamPage({ params }: PageProps) {
  const username = decodeURIComponent(params.username);

  // Hide global header and bottom nav for immersive stream experience
  useEffect(() => {
    document.body.classList.add('stream-view-mode');
    return () => {
      document.body.classList.remove('stream-view-mode');
    };
  }, []);

  return (
    <LiveRoomErrorBoundary>
      <SoloStreamViewer username={username} />
    </LiveRoomErrorBoundary>
  );
}
