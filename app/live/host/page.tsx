'use client';

import { useEffect } from 'react';
import SoloHostStream from '@/components/SoloHostStream';
import LiveRoomErrorBoundary from '@/components/LiveRoomErrorBoundary';

/**
 * Solo Host Stream Page
 * 
 * Dedicated page for streamers/hosts to broadcast.
 * Shows camera preview, chat, and streaming controls.
 * 
 * Route: /live/host
 */
export default function SoloHostStreamPage() {
  // Hide global header and bottom nav for immersive stream experience
  useEffect(() => {
    document.body.classList.add('stream-view-mode');
    return () => {
      document.body.classList.remove('stream-view-mode');
    };
  }, []);

  return (
    <LiveRoomErrorBoundary>
      <SoloHostStream />
    </LiveRoomErrorBoundary>
  );
}
