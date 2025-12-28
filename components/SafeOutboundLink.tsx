
'use client';

import { useCallback, useMemo, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { ExternalLink, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { getLinkSafety } from '@/lib/outboundLinks';

type SafeOutboundLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> & {
  href: string;
  children: ReactNode;
  className?: string;
};

export default function SafeOutboundLink({ href, children, className = '', ...rest }: SafeOutboundLinkProps) {
  const [open, setOpen] = useState(false);
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;

  const safety = useMemo(() => getLinkSafety(href, currentOrigin), [href, currentOrigin]);

  const openLink = useCallback(() => {
    if (!safety.normalizedUrl) return;
    window.open(safety.normalizedUrl, '_blank', 'noopener,noreferrer');
  }, [safety.normalizedUrl]);

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (safety.category === 'internal') {
        if (safety.normalizedUrl) window.location.assign(safety.normalizedUrl);
        return;
      }
      setOpen(true);
    },
    [safety.category, safety.normalizedUrl]
  );

  const title =
    safety.category === 'blocked'
      ? 'Blocked link'
      : safety.category === 'trusted'
        ? 'Leaving MyLiveLinks'
        : 'You are leaving MyLiveLinks';

  const description =
    safety.category === 'blocked'
      ? 'This destination is blocked for your safety.'
      : safety.category === 'trusted'
        ? `You are leaving MyLiveLinks to visit ${safety.hostname || 'a trusted site'}.`
        : `This link goes to ${safety.hostname || 'an unverified site'}. Only continue if you trust it.`;

  const Icon =
    safety.category === 'blocked'
      ? Shield
      : safety.category === 'trusted'
        ? ShieldCheck
        : ShieldAlert;

  const footer = (
    <>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button
        variant={safety.category === 'blocked' ? 'outline' : 'primary'}
        onClick={() => {
          if (safety.category === 'blocked') {
            setOpen(false);
            return;
          }
          openLink();
          setOpen(false);
        }}
        disabled={safety.category === 'blocked' || !safety.normalizedUrl}
      >
        Continue
      </Button>
    </>
  );

  return (
    <>
      <a
        href={safety.normalizedUrl || href}
        onClick={onClick}
        className={className}
        {...rest}
      >
        {children}
      </a>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        size="sm"
        footer={footer}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground break-all">{safety.normalizedUrl || href}</div>
              {safety.category === 'trusted' ? (
                <div className="text-xs text-muted-foreground">Trusted destination</div>
              ) : safety.category === 'blocked' ? (
                <div className="text-xs text-muted-foreground">Blocked destination</div>
              ) : (
                <div className="text-xs text-muted-foreground">Unverified destination</div>
              )}
            </div>
          </div>

          {safety.category !== 'blocked' ? (
            <div className="pt-1">
              <Button
                variant="link"
                onClick={() => {
                  openLink();
                  setOpen(false);
                }}
                rightIcon={<ExternalLink className="w-4 h-4" />}
              >
                Open in new tab
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
