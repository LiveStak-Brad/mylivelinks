'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { ProfileLocation } from '@/lib/location';

interface ProfileLocationRow {
  location_zip: string | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  location_label: string | null;
  location_hidden: boolean | null;
  location_show_zip: boolean | null;
  location_updated_at: string | null;
}

interface UseProfileLocationResult {
  location: ProfileLocation | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProfileLocation(): UseProfileLocationResult {
  const supabase = createClient();
  const [location, setLocation] = useState<ProfileLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLocation(null);
        setLoading(false);
        return;
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select(
          [
            'location_zip',
            'location_city',
            'location_region',
            'location_country',
            'location_label',
            'location_hidden',
            'location_show_zip',
            'location_updated_at',
          ].join(', ')
        )
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const row = data as ProfileLocationRow | null;

      if (!row) {
        setLocation(null);
      } else {
        setLocation({
          zip: row.location_zip,
          city: row.location_city,
          region: row.location_region,
          country: row.location_country,
          label: row.location_label,
          hidden: row.location_hidden,
          showZip: row.location_show_zip,
          updatedAt: row.location_updated_at,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load location');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchLocation();
  }, [fetchLocation]);

  return { location, loading, error, refresh: fetchLocation };
}
