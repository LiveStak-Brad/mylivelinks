'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { MapPin, ShieldCheck, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LOCATION_COPY } from './constants';
import { ProfileLocation } from '@/lib/location';
import { createClient } from '@/lib/supabase';

interface LocationEditorProps {
  location?: ProfileLocation | null;
  onSaved?: (location: ProfileLocation) => void;
}

export function LocationEditor({ location, onSaved }: LocationEditorProps) {
  const supabase = createClient();
  const [zip, setZip] = useState(location?.zip ?? '');
  const [label, setLabel] = useState(location?.label ?? '');
  const [hideLocation, setHideLocation] = useState(Boolean(location?.hidden));
  const [showZip, setShowZip] = useState(Boolean(location?.showZip));
  const [resolving, setResolving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedCity, setResolvedCity] = useState(location?.city ?? null);
  const [resolvedRegion, setResolvedRegion] = useState(location?.region ?? null);

  const helperText = useMemo(() => {
    if (resolvedCity && resolvedRegion) {
      return `Resolved to ${resolvedCity}, ${resolvedRegion}`;
    }
    return 'No location saved yet.';
  }, [resolvedCity, resolvedRegion]);

  const handleSave = async () => {
    const trimmedZip = zip.trim();
    if (trimmedZip.length < 5) {
      setError('Enter a 5-digit ZIP.');
      return;
    }

    setResolving(true);
    setError(null);
    setStatus(null);

    try {
      const { data, error: rpcError } = await (supabase as any).rpc('rpc_update_profile_location', {
        p_zip: trimmedZip,
        p_label: label.trim() || null,
        p_hide: hideLocation,
        p_show_zip: showZip,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const payload = Array.isArray(data) ? data[0] : data;
      if (!payload) {
        throw new Error('Missing response from Supabase');
      }

      setResolvedCity(payload.location_city);
      setResolvedRegion(payload.location_region);
      setStatus(`Saved ${payload.location_city}, ${payload.location_region}`);
      setZip(payload.location_zip ?? trimmedZip);

      onSaved?.({
        zip: payload.location_zip,
        city: payload.location_city,
        region: payload.location_region,
        country: payload.location_country,
        label: payload.location_label,
        hidden: payload.location_hidden,
        showZip: payload.location_show_zip,
        updatedAt: payload.location_updated_at,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Location (Optional)</h3>
            <p className="text-sm text-muted-foreground">{LOCATION_COPY.helper}</p>
            <p className="mt-1 text-xs text-muted-foreground">{LOCATION_COPY.disclaimer}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-[200px_1fr]">
            <div>
              <label className="text-sm font-medium text-foreground">ZIP Code</label>
              <div className="mt-2 flex gap-2">
                <Input
                  value={zip}
                  onChange={(event) => setZip(event.target.value)}
                  placeholder="e.g. 90012"
                  maxLength={5}
                />
                <Button onClick={handleSave} disabled={resolving}>
                  {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set'}
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Area label (optional)</label>
              <Input
                className="mt-2"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                maxLength={48}
                placeholder='e.g. "St. Louis Metro"'
              />
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-primary">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4" />
              Self-reported only
            </div>
            <p className="mt-1 text-xs text-primary/80">{helperText}</p>
          </div>

          <div className="flex flex-col gap-3 text-sm text-foreground">
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                checked={hideLocation}
                onChange={(event) => setHideLocation(event.target.checked)}
                className="h-4 w-4 rounded border-muted-foreground/60 text-primary"
              />
              Hide location from others
            </label>
            <label className={clsx('inline-flex items-center gap-3', hideLocation && 'opacity-50')}>
              <input
                type="checkbox"
                checked={showZip}
                onChange={(event) => setShowZip(event.target.checked)}
                disabled={hideLocation}
                className="h-4 w-4 rounded border-muted-foreground/60 text-primary"
              />
              Show ZIP publicly
            </label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {status && <p className="text-sm text-success">{status}</p>}
        </div>
      </div>
    </div>
  );
}
