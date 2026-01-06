import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function isMissingTableError(err: any): boolean {
  const msg = String(err?.message || '');
  const code = String(err?.code || '');
  return (
    code === '42P01' ||
    (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist')) ||
    (msg.toLowerCase().includes('waitlist_mobile') && msg.toLowerCase().includes('not found'))
  );
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from('waitlist_mobile')
      .select('email, created_at, unsubscribed_at')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({
          ok: true,
          total: 0,
          active: 0,
          unsubscribed: 0,
          emails: [],
          note: 'waitlist_mobile table not found. Apply migrations to enable tracking.',
        });
      }

      console.error('[owner][waitlist_mobile] select error:', error);
      return NextResponse.json({ ok: false, message: 'Failed to load waitlist' }, { status: 500 });
    }

    const rows = Array.isArray(data) ? (data as any[]) : [];
    const total = rows.length;
    const unsubscribed = rows.filter((r) => !!r.unsubscribed_at).length;
    const active = total - unsubscribed;
    const emails = rows.filter((r) => !r.unsubscribed_at).map((r) => String(r.email)).filter(Boolean);

    return NextResponse.json({
      ok: true,
      total,
      active,
      unsubscribed,
      emails,
    });
  } catch (err: any) {
    const msg = typeof err?.message === 'string' ? err.message : '';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ ok: false, message: status === 401 ? 'Unauthorized' : 'Forbidden' }, { status });
  }
}

