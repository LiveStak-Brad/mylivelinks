import { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createRouteHandlerClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type AdminAuthResult = {
  user: User;
};

export async function getSessionUser(request?: NextRequest): Promise<User | null> {
  const supabase = (() => {
    if (!request) return createServerSupabaseClient();

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        return createRouteHandlerClient(request);
      }
      return createSupabaseClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
    }

    return createRouteHandlerClient(request);
  })();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function requireAdmin(request?: NextRequest): Promise<AdminAuthResult> {
  const user = await getSessionUser(request);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  const admin = getSupabaseAdmin();

  // Prefer profiles.role authorization. If the column doesn't exist yet, fall back to legacy flags.
  const { data: profile, error } = await admin
    .from('profiles')
    .select('role, is_admin, is_owner')
    .eq('id', user.id)
    .single();

  if (error) {
    const msg = (error as any)?.message || '';
    if (typeof msg === 'string' && msg.toLowerCase().includes('column') && msg.toLowerCase().includes('role')) {
      const legacy = await admin
        .from('profiles')
        .select('is_admin, is_owner')
        .eq('id', user.id)
        .single();
      if (legacy.error) throw new Error('FORBIDDEN');
      const isLegacyAllowed = !!(legacy.data as any)?.is_admin || !!(legacy.data as any)?.is_owner;
      if (!isLegacyAllowed) throw new Error('FORBIDDEN');
      return { user };
    }

    throw new Error('FORBIDDEN');
  }

  const role = String((profile as any)?.role || '').toLowerCase();
  const isRoleAllowed = role === 'admin' || role === 'moderator';
  const isLegacyAllowed = !!(profile as any)?.is_admin || !!(profile as any)?.is_owner;

  if (!isRoleAllowed && !isLegacyAllowed) {
    throw new Error('FORBIDDEN');
  }

  return { user };
}
