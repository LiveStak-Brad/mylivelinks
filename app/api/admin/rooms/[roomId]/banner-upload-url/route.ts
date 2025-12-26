import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireUser } from '@/lib/rbac';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function extFromMime(mime: string) {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg') return 'jpg';
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  return null;
}

// POST /api/admin/rooms/:id/banner-upload-url
// Returns a signed upload URL (Supabase Storage) for room banner uploads.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await requireUser(request);
    const { roomId } = await params;
    if (!roomId) return NextResponse.json({ error: 'roomId is required' }, { status: 400 });

    const supabase = createRouteHandlerClient(request);

    const { data: canManage } = await supabase.rpc('is_room_admin', {
      p_profile_id: user.id,
      p_room_id: roomId,
    });

    if (canManage !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : null;
    if (!mimeType) return NextResponse.json({ error: 'mimeType is required' }, { status: 400 });

    const ext = extFromMime(mimeType);
    if (!ext) return NextResponse.json({ error: 'Unsupported mimeType' }, { status: 400 });

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_ROOM_IMAGES_BUCKET || 'room-images';
    const path = `${roomId}/banner-${crypto.randomUUID()}.${ext}`;

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to create signed upload URL' }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json(
      {
        bucket,
        path,
        signedUrl: data.signedUrl,
        token: data.token,
        publicUrl: publicUrlData?.publicUrl ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    return authErrorToResponse(err);
  }
}
