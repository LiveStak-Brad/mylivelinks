'use client';

type SwipeActionVariant = 'regular' | 'dating' | 'auto';

interface SwipeActionBarProps {
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  onInfo?: () => void;
  disabled?: boolean;
  variant?: SwipeActionVariant;
}

const variantStyles: Record<SwipeActionVariant, {
  primaryGradient: string;
  accentText: string;
}> = {
  regular: {
    primaryGradient: 'from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700',
    accentText: 'text-blue-600 dark:text-blue-400',
  },
  dating: {
    primaryGradient: 'from-pink-500 via-rose-500 to-fuchsia-500 hover:from-pink-600 hover:via-rose-600 hover:to-fuchsia-600',
    accentText: 'text-pink-600 dark:text-pink-400',
  },
  auto: {
    primaryGradient: 'from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600',
    accentText: 'text-emerald-600 dark:text-emerald-400',
  },
};

const BOTTOM_NAV_CLEARANCE_PX = 86;

export function SwipeActionBar({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onInfo,
  disabled = false,
  variant = 'regular',
}: SwipeActionBarProps) {
  const infoHandler = onInfo ?? (() => {});
  const showInfoButton = Boolean(onInfo);
  const stickyOffset = `calc(env(safe-area-inset-bottom, 0px) + ${BOTTOM_NAV_CLEARANCE_PX}px)`;
  const safePadding = 'calc(env(safe-area-inset-bottom, 0px) + 8px)';
  const styles = variantStyles[variant];

  return (
    <div
      className="sticky bottom-0 z-40"
      style={{ bottom: stickyOffset }}
    >
      <div
        className="rounded-[28px] border border-white/60 bg-white/95 p-4 shadow-[0_12px_40px_rgba(5,5,5,0.15)] backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/95"
        style={{ paddingBottom: safePadding }}
      >
        <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <span className="text-current">Actions</span>
          <span className={`text-[0.7rem] ${styles.accentText}`}>Always available</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label={secondaryLabel}
            onClick={onSecondary}
            disabled={disabled}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all duration-200 hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500"
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {showInfoButton && (
            <button
              type="button"
              aria-label="Profile info"
              onClick={infoHandler}
              disabled={disabled}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}

          <button
            type="button"
            aria-label={primaryLabel}
            onClick={onPrimary}
            disabled={disabled}
            className={`flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r text-lg font-semibold text-white shadow-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50 ${styles.primaryGradient}`}
          >
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

