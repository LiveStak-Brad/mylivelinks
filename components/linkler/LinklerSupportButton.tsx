'use client';

import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui';
import { LinklerPanel } from './LinklerPanel';
import { useLinklerPanel } from './useLinklerPanel';
import { LinklerWidget } from './LinklerWidget';

export interface LinklerSupportButtonProps {
  variant?: 'default' | 'compact';
  /** When true, hide the button while a fullscreen live experience is active */
  disableDuringLive?: boolean;
  /** Signal from the host page that we are in a fullscreen live context */
  isLiveContext?: boolean;
  /** Allow pages to forcibly hide Linkler (e.g. custom flows) */
  forceHidden?: boolean;
}

const BLOCKED_ROUTE_PREFIXES = [
  '/wallet',
  '/coins',
  '/transactions',
  '/checkout',
  '/cashout',
  '/composer',
  '/rooms/host',
  '/live/host',
  '/posts/new',
  '/apply',
  '/owner',
  '/admin',
];

const BLOCKED_EXACT = new Set([
  '/login',
  '/signup',
  '/reset-password',
  '/onboarding',
  '/oauth/consent',
]);

function shouldHideForPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (BLOCKED_EXACT.has(pathname)) return true;
  return BLOCKED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function LinklerSupportButton({
  variant = 'default',
  disableDuringLive = false,
  isLiveContext = false,
  forceHidden = false,
}: LinklerSupportButtonProps) {
  const pathname = usePathname();
  const linklerState = useLinklerPanel();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isHidden = useMemo(() => {
    if (forceHidden) return true;
    if (disableDuringLive && isLiveContext) return true;
    return shouldHideForPath(pathname);
  }, [forceHidden, disableDuringLive, isLiveContext, pathname]);

  if (isHidden) {
    return null;
  }

  const handleOpenPanel = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <LinklerWidget
        onOpenPanel={handleOpenPanel}
        defaultSize={variant === 'compact' ? 'small' : 'large'}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Linkler"
        description="AI support + companion chat"
        size="md"
        scrollableContent={false}
      >
        <div className="flex h-full w-full flex-col">
          <LinklerPanel state={linklerState} />
        </div>
      </Modal>
    </>
  );
}

export default LinklerSupportButton;
