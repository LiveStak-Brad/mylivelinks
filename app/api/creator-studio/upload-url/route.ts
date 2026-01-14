import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAuthedRouteHandlerClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { item_id, file_name, content_type } = body;

    if (!item_id || typeof item_id !== 'string') {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
    }

    if (!file_name || typeof file_name !== 'string') {
      return NextResponse.json({ error: 'file_name is required' }, { status: 400 });
    }

    const { data: itemData, error: itemError } = await supabase.rpc('get_creator_studio_item', {
      p_item_id: item_id,
    });

    if (itemError || !itemData || (Array.isArray(itemData) && itemData.length === 0)) {
      return NextResponse.json({ error: 'Item not found or not owned by user' }, { status: 404 });
    }

    const bucket = 'uploads';
    const storagePath = `creator-studio/${item_id}/${file_name}`;

    const admin = getSupabaseAdmin();
    const { data: signed, error: signedErr } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (signedErr || !signed) {
      return NextResponse.json(
        { error: signedErr?.message || 'Failed to create signed upload URL' },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(storagePath);

    return NextResponse.json({
      item_id,
      storage_path: storagePath,
      bucket,
      signed_url: signed.signedUrl,
      token: signed.token,
      public_url: publicUrlData?.publicUrl ?? null,
    });
  } catch (err) {
    console.error('POST /api/creator-studio/upload-url error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
