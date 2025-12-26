import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireOwner } from '@/lib/rbac';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    await requireOwner(request);

    const supabase = createRouteHandlerClient(request);
    const { data: roles, error } = await supabase
      .from('app_roles')
      .select('profile_id, role, created_at, created_by')
      .eq('role', 'app_admin')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const profileIds = Array.from(new Set((roles || []).map((r: any) => r.profile_id)));
    const createdByIds = Array.from(new Set((roles || []).map((r: any) => r.created_by).filter(Boolean)));

    const admin = getSupabaseAdmin();
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', profileIds);

    const { data: creators } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', createdByIds);

    const profileById = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));
    const creatorById = new Map<string, any>((creators || []).map((p: any) => [p.id, p]));

    const app_admins = (roles || []).map((r: any) => ({
      profile_id: r.profile_id,
      role: r.role,
      created_at: r.created_at,
      created_by: r.created_by,
      profile: profileById.get(r.profile_id) || null,
      created_by_profile: r.created_by ? creatorById.get(r.created_by) || null : null,
    }));

    return NextResponse.json({ app_admins }, { status: 200 });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOwner(request);

    const body = await request.json().catch(() => null);
    const profileId = typeof body?.profileId === 'string' ? body.profileId : null;
    if (!profileId) return NextResponse.json({ error: 'profileId is required' }, { status: 400 });

    const supabase = createRouteHandlerClient(request);
    const { error } = await supabase.rpc('grant_app_admin', { p_target_profile_id: profileId });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireOwner(request);

    const body = await request.json().catch(() => null);
    const profileId = typeof body?.profileId === 'string' ? body.profileId : null;
    if (!profileId) return NextResponse.json({ error: 'profileId is required' }, { status: 400 });

    const supabase = createRouteHandlerClient(request);
    const { error } = await supabase.rpc('revoke_app_admin', { p_target_profile_id: profileId });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
