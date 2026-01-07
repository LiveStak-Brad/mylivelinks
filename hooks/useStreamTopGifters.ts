 'use client';
 
 import { useEffect, useMemo, useState } from 'react';
 import { createClient } from '@/lib/supabase';
 
 export interface StreamTopGifter {
   profile_id: string; // sender_id
   username: string;
   display_name?: string | null;
   avatar_url?: string | null;
   total_coins: number;
   rank: number;
 }
 
 function normalizeBigintLike(v: unknown): number {
   const n = typeof v === 'number' ? v : Number(v ?? 0);
   return Number.isFinite(n) ? n : 0;
 }
 
 /**
  * Stream-scoped Top Gifters (WEB Solo Live)
  *
  * Source of truth: `gifts` rows filtered by `live_stream_id`.
  * Aggregation: group by sender_id, sum coin_amount, sort desc.
  *
  * Polling is used intentionally (P0 safe) to avoid realtime load/regressions.
  */
 export function useStreamTopGifters({
   liveStreamId,
   enabled = true,
   pollIntervalMs = 7000,
   limit = 20,
 }: {
   liveStreamId?: number | null;
   enabled?: boolean;
   pollIntervalMs?: number;
   limit?: number;
 }) {
   const supabase = useMemo(() => createClient(), []);
   const [gifters, setGifters] = useState<StreamTopGifter[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
 
   useEffect(() => {
     if (!enabled || !liveStreamId) {
       setGifters([]);
       setLoading(false);
       setError(null);
       return;
     }
 
     let cancelled = false;
     let interval: ReturnType<typeof setInterval> | null = null;
 
     const load = async (showLoading: boolean) => {
       if (showLoading) setLoading(true);
       setError(null);
 
       try {
         const { data, error: qErr } = await supabase
           .from('gifts')
           .select(
             `
               sender_id,
               coin_amount,
               sender:profiles!gifts_sender_id_fkey(
                 id,
                 username,
                 display_name,
                 avatar_url
               )
             `
           )
           .eq('live_stream_id', liveStreamId)
           .not('sender_id', 'is', null);
 
         if (qErr) throw qErr;
 
         const gifterMap = new Map<string, { total: number; profile: any }>();
         (data ?? []).forEach((gift: any) => {
           const senderId = gift?.sender_id;
           const profile = gift?.sender;
           if (!senderId || !profile) return;
 
           const delta = normalizeBigintLike(gift?.coin_amount);
           const existing = gifterMap.get(senderId);
           if (existing) {
             existing.total += delta;
           } else {
             gifterMap.set(senderId, { total: delta, profile });
           }
         });
 
         const sorted = Array.from(gifterMap.entries())
           .sort((a, b) => b[1].total - a[1].total)
           .slice(0, Math.max(1, limit))
           .map(([senderId, v], idx) => ({
             profile_id: senderId,
             username: v.profile?.username || 'Unknown',
             display_name: v.profile?.display_name ?? null,
             avatar_url: v.profile?.avatar_url ?? null,
             total_coins: v.total,
             rank: idx + 1,
           })) satisfies StreamTopGifter[];
 
         if (!cancelled) setGifters(sorted);
       } catch (e: any) {
         if (!cancelled) {
           setGifters([]);
           setError(e?.message ? String(e.message) : 'Failed to load top gifters');
         }
       } finally {
         if (!cancelled) setLoading(false);
       }
     };
 
     // initial load + polling
     void load(true);
     interval = setInterval(() => void load(false), Math.max(2000, pollIntervalMs));
 
     return () => {
       cancelled = true;
       if (interval) clearInterval(interval);
     };
   }, [enabled, liveStreamId, limit, pollIntervalMs, supabase]);
 
   return { gifters, loading, error };
 }
 
