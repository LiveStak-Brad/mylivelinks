'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { ProfileLocation } from '@/lib/location';

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

      if (!data) {
        setLocation(null);
      } else {
        setLocation({
          zip: data.location_zip,
          city: data.location_city,
          region: data.location_region,
          country: data.location_country,
          label: data.location_label,
          hidden: data.location_hidden,
          showZip: data.location_show_zip,
          updatedAt: data.location_updated_at,
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
