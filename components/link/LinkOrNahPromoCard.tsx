'use client';

import { useMemo, useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export type LinkOrNahPromoCardProps = {
  className?: string;
  onDismiss?: () => void;
  onCtaClick?: () => void;
  hasSwipedFiveOrMore?: boolean;
  isLiveStreaming?: boolean;
  isViewingStream?: boolean;
  isMessaging?: boolean;
  isInLinkFlow?: boolean;
  showTooltip?: boolean;
  tooltipText?: string;
  microCopy?: string;
};

const CTA_ROUTE = '/link';
const DEFAULT_TOOLTIP = "Link only if it's mutual.";
const DEFAULT_MICRO_COPY = 'No messages unless you both link';

export function LinkOrNahPromoCard({
  className,
  onDismiss,
  onCtaClick,
  hasSwipedFiveOrMore = false,
  isLiveStreaming = false,
  isViewingStream = false,
  isMessaging = false,
  isInLinkFlow = false,
  showTooltip = false,
  tooltipText,
  microCopy = DEFAULT_MICRO_COPY,
}: LinkOrNahPromoCardProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const gradientId = useId();

  const shouldHide = useMemo(
    () => hasSwipedFiveOrMore || isLiveStreaming || isViewingStream || isMessaging || isInLinkFlow,
    [hasSwipedFiveOrMore, isInLinkFlow, isLiveStreaming, isMessaging, isViewingStream]
  );

  if (shouldHide || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleCta = () => {
    onCtaClick?.();
    router.push(CTA_ROUTE);
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent via-[#f472b6] to-primary p-5 sm:p-6 text-white shadow-[0_15px_40px_rgba(79,70,229,0.35)]',
        className
      )}
    >
      {showTooltip && (
        <div className="absolute -top-3 left-6 text-background">
          <div className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-primary shadow-lg shadow-primary/30">
            {tooltipText || DEFAULT_TOOLTIP}
          </div>
          <div className="ml-4 h-2 w-2 rotate-45 rounded-[2px] bg-white/95 shadow-lg shadow-primary/30" />
        </div>
      )}

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss Link or Nah promo"
        className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative flex items-center sm:items-start">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-inner shadow-white/20">
            <svg
              className="h-9 w-9"
              viewBox="0 0 24 24"
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgb(37, 99, 235)" />
                  <stop offset="100%" stopColor="rgb(168, 85, 247)" />
                </linearGradient>
              </defs>
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <span className="absolute -top-2 -left-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white shadow">
            <Sparkles className="h-4 w-4" />
          </span>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h2 className="text-2xl font-bold leading-tight">Link or Nah</h2>
          </div>
          <p className="text-base text-white/90">
            Swipe to connect. Mutual links only. No DMs.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="gradient"
              size="lg"
              className="min-w-[140px] bg-gradient-to-r from-[#1e40af] via-[#4338ca] to-[#9333ea] shadow-lg shadow-black/25 hover:opacity-95"
              onClick={handleCta}
            >
              Try It
            </Button>
            <p className="text-xs text-white/80">{microCopy}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

