import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

function validateEmail(email: string) {
  const r = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return r.test(email);
}

function isMissingTableError(err: any): boolean {
  const msg = String(err?.message || '');
  const code = String(err?.code || '');
  // PostgREST / Supabase error shapes vary; handle common patterns.
  return (
    code === '42P01' ||
    msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist') ||
    msg.toLowerCase().includes('waitlist_mobile') && msg.toLowerCase().includes('not found')
  );
}

export async function POST(req: NextRequest) {
  let email = '';

  try {
    const body = await req.json();
    email = String(body?.email || '').toLowerCase().trim();
  } catch {
    email = '';
  }

  if (!email || !validateEmail(email)) {
    return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });
  }

  // Deterministic strategy for unsubscribe support:
  // - New signup: generate token via randomUUID()
  // - Existing email: keep existing token (idempotent)
  const freshToken = (() => {
    try {
      return randomUUID();
    } catch {
      return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  })();

  try {
    const admin = getSupabaseAdmin();

    // Try to read first to keep token stable for existing emails (idempotent).
    const existing = await admin
      .from('waitlist_mobile')
      .select('email, unsubscribe_token, unsubscribed_at')
      .eq('email', email)
      .maybeSingle();

    if (!existing.error && existing.data?.email) {
      // If previously unsubscribed, re-subscribe with a new token.
      if (existing.data.unsubscribed_at) {
        await admin
          .from('waitlist_mobile')
          .update({
            unsubscribe_token: freshToken,
            unsubscribed_at: null,
          })
          .eq('email', email);
      }

      return NextResponse.json({ ok: true });
    }

    // If table isn't set up yet, don't fail the UX.
    if (existing.error && isMissingTableError(existing.error)) {
      console.warn('[waitlist_mobile] Table missing; email captured but not stored:', email);
      return NextResponse.json({ ok: true });
    }

    // Insert new row
    const insert = await admin.from('waitlist_mobile').insert({
      email,
      unsubscribe_token: freshToken,
      created_at: new Date().toISOString(),
      unsubscribed_at: null,
    });

    if (insert.error) {
      if (isMissingTableError(insert.error)) {
        console.warn('[waitlist_mobile] Table missing; email captured but not stored:', email);
        return NextResponse.json({ ok: true });
      }

      // Never throw raw errors to the client.
      console.error('[waitlist_mobile] insert error:', insert.error);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Missing env vars or other server issues. Do not break the client UX.
    console.error('[waitlist_mobile] server exception:', err);
    return NextResponse.json({ ok: true });
  }
}
