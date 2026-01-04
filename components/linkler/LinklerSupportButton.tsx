'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Tooltip, Modal } from '@/components/ui';
import { LinklerPanel } from './LinklerPanel';
import { useLinklerPanel } from './useLinklerPanel';

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
  const [isPointerFine, setIsPointerFine] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(pointer: fine)');
    const update = () => setIsPointerFine(mediaQuery.matches);
    update();

    if (typeof mediaQuery.addEventListener === 'function') {
      const listener = (event: MediaQueryListEvent) => setIsPointerFine(event.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

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

  const buttonSizeClasses =
    variant === 'compact'
      ? 'w-24 h-24 sm:w-28 sm:h-28'
      : 'w-28 h-28 sm:w-32 sm:h-32';

  const imageSizeClasses =
    variant === 'compact'
      ? 'w-20 h-20 sm:w-24 sm:h-24'
      : 'w-24 h-24 sm:w-28 sm:h-28';

  const tooltipContent = (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold">Linkler</p>
      <p className="text-xs text-muted-foreground">AI Support &amp; Companion</p>
    </div>
  );

  return (
    <>
      <div
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6"
        style={{
          zIndex: 60,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <Tooltip content={tooltipContent} position="left" disabled={!isPointerFine}>
          <button
            type="button"
            onClick={handleOpenPanel}
            className={`
              ${buttonSizeClasses}
              rounded-full bg-transparent
              flex items-center justify-center overflow-hidden
              transition-transform duration-200
              hover:-translate-y-0.5
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background
              active:scale-95
            `}
            aria-label="Open Linkler support panel"
          >
            <Image
              src="/images/linkler.png"
              alt="Linkler mascot"
              width={56}
              height={56}
              className={`object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.25)] ${imageSizeClasses}`}
              priority={false}
              draggable={false}
            />
          </button>
        </Tooltip>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Linkler"
        description="AI support + companion chat"
        size="md"
      >
        <LinklerPanel state={linklerState} />
      </Modal>
    </>
  );
}

export default LinklerSupportButton;
