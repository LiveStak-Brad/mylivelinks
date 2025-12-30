'use client';

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
  return (
    <LiveRoomErrorBoundary>
      <SoloHostStream />
    </LiveRoomErrorBoundary>
  );
}
