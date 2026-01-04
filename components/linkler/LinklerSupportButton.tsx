'use client';

import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, Tooltip, Modal } from '@/components/ui';

type LinklerSupportContext = {
  /** Optional override for the primary CTA destination */
  supportHref?: string;
  /** Optional override for the safety resources destination */
  safetyHref?: string;
  /** Notify the host app whenever Linkler opens */
  onOpenSupport?: () => void;
};

export interface LinklerSupportButtonProps {
  variant?: 'default' | 'compact';
  /** When true, hide the button while a fullscreen live experience is active */
  disableDuringLive?: boolean;
  /** Signal from the host page that we are in a fullscreen live context */
  isLiveContext?: boolean;
  /** Allow pages to forcibly hide Linkler (e.g. custom flows) */
  forceHidden?: boolean;
  context?: LinklerSupportContext;
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
  context,
}: LinklerSupportButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
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

  const supportHref = context?.supportHref ?? '/messages?intent=support';
  const safetyHref = context?.safetyHref ?? '/policies';

  const handleOpenPanel = () => {
    setIsModalOpen(true);
    context?.onOpenSupport?.();
  };

  const handleSupportClick = () => {
    if (supportHref.startsWith('http') || supportHref.startsWith('mailto:')) {
      window.open(supportHref, '_blank');
      return;
    }
    router.push(supportHref);
  };

  const handleSafetyClick = () => {
    if (safetyHref.startsWith('http')) {
      window.open(safetyHref, '_blank');
      return;
    }
    router.push(safetyHref);
  };

  const buttonSizeClasses =
    variant === 'compact'
      ? 'w-11 h-11 sm:w-12 sm:h-12'
      : 'w-12 h-12 sm:w-14 sm:h-14';

  const tooltipContent = (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold">Linkler</p>
      <p className="text-xs text-muted-foreground">Support &amp; Safety Assistant</p>
    </div>
  );

  return (
    <>
      <div
        className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6"
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
              rounded-full bg-white/90 dark:bg-gray-900/90
              border border-white/70 dark:border-gray-800/70
              shadow-lg shadow-primary/20
              flex items-center justify-center overflow-hidden
              transition-transform duration-200
              hover:-translate-y-0.5 hover:shadow-xl
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2
              active:scale-95
            `}
            aria-label="Open Linkler support panel"
          >
            <Image
              src="/images/linkler.png"
              alt="Linkler mascot"
              width={56}
              height={56}
              className="object-contain w-10 h-10 sm:w-12 sm:h-12"
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
        description="Support & Safety Assistant"
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">AI-assisted. Human-reviewed.</p>
            <p className="text-sm text-muted-foreground">
              Linkler connects you to human moderators and safety tools whenever you need a hand.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl bg-muted/40 p-4 border border-muted/40">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Quick actions</p>
              <p className="text-base font-semibold text-foreground mt-1">How can we help?</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={handleSupportClick}
                variant="gradient"
              >
                Contact Support
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={handleSafetyClick}
              >
                View Safety Center
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-muted/60 p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Image
                  src="/images/linkler.png"
                  alt="Linkler mascot"
                  width={48}
                  height={48}
                  className="object-contain w-10 h-10"
                  priority={false}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Linkler keeps an eye on support requests, referral issues, and safety escalations so the human team can jump in faster.
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Need immediate assistance? Email{' '}
              <button
                type="button"
                className="font-semibold text-primary underline-offset-2 hover:underline"
                onClick={() => window.open('mailto:support@mylivelinks.com')}
              >
                support@mylivelinks.com
              </button>
              .
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default LinklerSupportButton;
