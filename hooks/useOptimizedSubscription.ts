/**
 * Optimized Subscription Hook
 * Manages selective subscriptions to reduce overhead
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SubscriptionConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  callback: (payload: unknown) => void;
  enabled?: boolean;
}

export function useOptimizedSubscription(config: SubscriptionConfig) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { table, event = '*', filter, callback, enabled = true } = config;

  useEffect(() => {
    if (!enabled) return;

    const channelName = `optimized-${table}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    if (filter) {
      (channel as unknown as { on: (...args: any[]) => any }).on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        callback
      );
    } else {
      (channel as unknown as { on: (...args: any[]) => any }).on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
        },
        callback
      );
    }

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, table, event, filter, callback, supabase]);
}

/**
 * Batch multiple subscriptions efficiently
 */
export function useBatchSubscriptions(configs: SubscriptionConfig[]) {
  const supabase = createClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    const enabledConfigs = configs.filter((c) => c.enabled !== false);

    enabledConfigs.forEach((config) => {
      const channelName = `batch-${config.table}-${Date.now()}`;
      const channel = supabase.channel(channelName);

      if (config.filter) {
        (channel as unknown as { on: (...args: any[]) => any }).on(
          'postgres_changes',
          {
            event: config.event || '*',
            schema: 'public',
            table: config.table,
            filter: config.filter,
          },
          config.callback
        );
      } else {
        (channel as unknown as { on: (...args: any[]) => any }).on(
          'postgres_changes',
          {
            event: config.event || '*',
            schema: 'public',
            table: config.table,
          },
          config.callback
        );
      }

      channel.subscribe();
      channelsRef.current.push(channel);
    });

    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [configs, supabase]);
}


