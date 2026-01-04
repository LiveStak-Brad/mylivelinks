import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createRouteHandlerClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export function generateReqId() {
  try {
    return randomUUID();
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export function adminJson(reqId: string, data: unknown, status = 200) {
  return NextResponse.json({ ok: true, reqId, data }, { status });
}

export function adminError(reqId: string, message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      reqId,
      error: {
        message,
        status,
        details: details ?? null,
      },
    },
    { status }
  );
}

export type AdminAuthResult = {
  user: User;
  profileId: string;
};

export function createAuthedRouteHandlerClient(request: NextRequest) {
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
}

export async function getSessionUser(request?: NextRequest): Promise<User | null> {
  const supabase = request ? createAuthedRouteHandlerClient(request) : createServerSupabaseClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function requireAdmin(request?: NextRequest): Promise<AdminAuthResult> {
  const user = await getSessionUser(request);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  const supabase = request ? createAuthedRouteHandlerClient(request) : createServerSupabaseClient();
  const { data: isAdmin, error: isAdminError } = await supabase.rpc('is_admin', {
    uid: user.id,
  });

  if (!isAdminError && isAdmin) {
    return { user, profileId: user.id };
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from('profiles')
      .select('is_admin, is_owner')
      .eq('id', user.id)
      .single();

    const legacyAllowed = !!profile?.is_admin || !!profile?.is_owner;
    if (!legacyAllowed) throw new Error('FORBIDDEN');
    return { user, profileId: user.id };
  } catch {
    throw new Error('FORBIDDEN');
  }
}

export async function requireOwner(request?: NextRequest): Promise<AdminAuthResult> {
  const ownerProfileId = process.env.OWNER_PROFILE_ID?.trim();
  if (!ownerProfileId) {
    throw new Error('FORBIDDEN');
  }

  const user = await getSessionUser(request);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  if (user.id !== ownerProfileId) {
    throw new Error('FORBIDDEN');
  }

  return { user, profileId: user.id };
}
