'use client';

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';

const INSTALL_FLAG_KEY = 'mll_pwa_installed';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type RenderProps = {
  onClick: () => void;
  disabled: boolean;
  label: string;
  isIOS: boolean;
  isIOSSafari: boolean;
  supportsInstallPrompt: boolean;
};

interface PwaInstallButtonProps
  extends Pick<ButtonProps, 'variant' | 'size' | 'className' | 'fullWidth'> {
  label?: string;
  children?: (props: RenderProps) => ReactNode;
  /** Optional callback, useful for closing menus before triggering the prompt */
  onBeforePrompt?: () => void;
}

const defaultLabel = 'Download App';

function isIOSSafari(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  if (!isIOS) {
    return { isIOS: false, isIOSSafari: false };
  }
  const isSafari =
    ua.includes('safari') &&
    !ua.includes('crios') &&
    !ua.includes('fxios') &&
    !ua.includes('edgios') &&
    !ua.includes('opios');

  return { isIOS: true, isIOSSafari: isSafari };
}

export function PwaInstallButton({
  label = defaultLabel,
  variant = 'gradient',
  size = 'md',
  className = '',
  fullWidth = false,
  children,
  onBeforePrompt,
}: PwaInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [showIOSHelper, setShowIOSHelper] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  const supportsInstallPrompt = useMemo(() => !!deferredPrompt, [deferredPrompt]);
  const isIOSSafariDevice = isIOS && isSafari;
  const isActionDisabled = !isIOSSafariDevice && !supportsInstallPrompt;

  const markInstalled = useCallback(() => {
    setIsInstalled(true);
    try {
      localStorage.setItem(INSTALL_FLAG_KEY, 'true');
    } catch {
      // Ignore storage failures
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (localStorage.getItem(INSTALL_FLAG_KEY) === 'true') {
        setIsInstalled(true);
      }
    } catch {
      // Ignore storage failures
    }

    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)')
        : null;

    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone = (mediaQuery?.matches ?? false) || Boolean(nav?.standalone);
    if (standalone) {
      markInstalled();
    }

    const { isIOS: iosDetected, isIOSSafari: safariDetected } = isIOSSafari(
      navigator.userAgent || ''
    );
    setIsIOS(iosDetected);
    setIsSafari(safariDetected);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      markInstalled();
    };

    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        markInstalled();
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleDisplayModeChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleDisplayModeChange);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery) {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', handleDisplayModeChange);
        } else if (typeof mediaQuery.removeListener === 'function') {
          mediaQuery.removeListener(handleDisplayModeChange);
        }
      }
    };
  }, [markInstalled]);

  const handleClick = useCallback(async () => {
    if (isInstalled || isActionDisabled) {
      return;
    }

    onBeforePrompt?.();

    if (isIOSSafariDevice) {
      setShowIOSHelper(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    try {
      setIsPrompting(true);
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        markInstalled();
      }
    } catch (error) {
      console.error('PWA install prompt failed', error);
    } finally {
      setIsPrompting(false);
      setDeferredPrompt(null);
    }
  }, [
    deferredPrompt,
    isActionDisabled,
    isIOSSafariDevice,
    isInstalled,
    markInstalled,
    onBeforePrompt,
  ]);

  if (isInstalled) {
    return null;
  }

  const buttonContent = children ? (
    children({
      onClick: handleClick,
      disabled: isActionDisabled || isPrompting,
      label,
      isIOS,
      isIOSSafari: isIOSSafariDevice,
      supportsInstallPrompt,
    })
  ) : (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isActionDisabled || isPrompting}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      leftIcon={<Download className="w-4 h-4" />}
    >
      {label}
    </Button>
  );

  return (
    <>
      {buttonContent}

      <Modal
        isOpen={showIOSHelper}
        onClose={() => setShowIOSHelper(false)}
        title="Install Live Links"
        description="Add the app to your home screen for faster access."
        size="sm"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setShowIOSHelper(false)}>
            Got it
          </Button>
        }
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Share2 className="h-5 w-5" />
            </div>
            <p className="text-base text-foreground font-semibold">
              Tap Share → Add to Home Screen
            </p>
          </div>
          <ol className="list-decimal list-inside space-y-2">
            <li>Tap the Share icon in Safari’s toolbar.</li>
            <li>Choose “Add to Home Screen”.</li>
            <li>Confirm by tapping “Add”.</li>
          </ol>
          <p className="text-xs text-muted-foreground/80">
            The button disappears once installation is complete.
          </p>
        </div>
      </Modal>
    </>
  );
}

export default PwaInstallButton;
