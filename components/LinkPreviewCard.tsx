'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import SafeOutboundLink from '@/components/SafeOutboundLink';
import { normalizeUrl } from '@/lib/outboundLinks';

type LinkMetadata = {
  url: string;
  hostname: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

const cache = new Map<string, LinkMetadata | null>();

export default function LinkPreviewCard({ url }: { url: string }) {
  const normalized = useMemo(() => normalizeUrl(url), [url]);
  const [data, setData] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!normalized) return;
    const cached = cache.get(normalized);
    if (cached !== undefined) {
      setData(cached);
      return;
    }

    let canceled = false;
    setLoading(true);
    fetch(`/api/link-metadata?url=${encodeURIComponent(normalized)}`)
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as LinkMetadata;
      })
      .then((json) => {
        if (canceled) return;
        cache.set(normalized, json);
        setData(json);
      })
      .catch(() => {
        if (canceled) return;
        cache.set(normalized, null);
        setData(null);
      })
      .finally(() => {
        if (canceled) return;
        setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [normalized]);

  if (!normalized) return null;
  if (!loading && !data) return null;

  return (
    <Card className="overflow-hidden border border-border bg-muted/10">
      <div className="flex gap-3">
        {data?.image ? (
          <div className="w-20 h-20 shrink-0 bg-muted overflow-hidden">
            <img src={data.image} alt={data.title || data.hostname || 'Link preview'} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-20 h-20 shrink-0 bg-muted" />
        )}

        <div className="flex-1 min-w-0 p-3">
          <div className="text-xs text-muted-foreground truncate">{data?.siteName || data?.hostname || 'Link'}</div>
          <div className="text-sm font-semibold text-foreground line-clamp-2">
            {loading ? 'Loading preview…' : data?.title || data?.url || normalized}
          </div>
          {data?.description ? (
            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{data.description}</div>
          ) : null}

          <div className="mt-2">
            <SafeOutboundLink href={normalized} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <span>Open</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </SafeOutboundLink>
          </div>
        </div>
      </div>
    </Card>
  );
}
