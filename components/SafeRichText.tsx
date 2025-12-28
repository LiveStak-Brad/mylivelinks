'use client';

import { useMemo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import SafeOutboundLink from '@/components/SafeOutboundLink';
import { extractUrlsFromText, normalizeUrl } from '@/lib/outboundLinks';

const LinkPreviewCard = dynamic(() => import('@/components/LinkPreviewCard'), { ssr: false });

type SafeRichTextProps = {
  text: string;
  className?: string;
  linkClassName?: string;
  showLinkPreview?: boolean;
};

function shorten(url: string) {
  const s = url.replace(/^https?:\/\//i, '');
  if (s.length <= 48) return s;
  return `${s.slice(0, 28)}…${s.slice(-14)}`;
}

export default function SafeRichText({ text, className = '', linkClassName = 'text-primary underline underline-offset-2', showLinkPreview = false }: SafeRichTextProps) {
  const urls = useMemo(() => extractUrlsFromText(text), [text]);
  const firstUrl = urls.length ? urls[0] : null;

  const nodes = useMemo(() => {
    const raw = String(text || '');
    if (!raw) return null;

    const re = /\b(https?:\/\/[^\s<]+|www\.[^\s<]+)\b/gi;
    const out: ReactNode[] = [];
    let last = 0;

    for (const m of raw.matchAll(re)) {
      const match = m[0];
      const idx = m.index ?? -1;
      if (!match || idx < 0) continue;

      const cleaned = match.replace(/[),.;!?]+$/, '');
      const end = idx + match.length;

      if (idx > last) out.push(raw.slice(last, idx));

      const normalized = normalizeUrl(cleaned);
      if (normalized) {
        out.push(
          <SafeOutboundLink key={`${idx}-${cleaned}`} href={normalized} className={linkClassName}>
            {shorten(cleaned)}
          </SafeOutboundLink>
        );
      } else {
        out.push(cleaned);
      }

      out.push(raw.slice(idx + cleaned.length, end));
      last = end;
    }

    if (last < raw.length) out.push(raw.slice(last));
    return out;
  }, [linkClassName, text]);

  return (
    <span className={className}>
      {nodes}
      {showLinkPreview && firstUrl ? (
        <span className="block mt-3">
          <LinkPreviewCard url={firstUrl} />
        </span>
      ) : null}
    </span>
  );
}
