import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient, getSessionUser } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const textContent = typeof body?.text_content === 'string' ? body.text_content.trim() : '';
    const mediaUrl = typeof body?.media_url === 'string' ? body.media_url.trim() : null;
    const visibility = typeof body?.visibility === 'string' && ['public', 'friends', 'followers'].includes(body.visibility) 
      ? body.visibility 
      : 'public';
    const feelingId = typeof body?.feeling_id === 'number' ? body.feeling_id : null;
    const targetProfileId = typeof body?.target_profile_id === 'string' ? body.target_profile_id : null;

    if (!textContent && !(mediaUrl && mediaUrl.length) && !feelingId) {
      return NextResponse.json({ error: 'text_content, media_url, or feeling is required' }, { status: 400 });
    }

    const supabase = createAuthedRouteHandlerClient(request);

    // Check if posting to own page or someone else's page
    const isOwnPage = !targetProfileId || targetProfileId === user.id;
    
    // Determine approval status
    let approvalStatus = 'approved'; // Default for own posts
    
    if (!isOwnPage) {
      // Check if user is auto-approved for this page
      const { data: autoApproved } = await supabase
        .from('auto_approved_users')
        .select('id')
        .eq('page_owner_id', targetProfileId)
        .eq('approved_user_id', user.id)
        .maybeSingle();
      
      if (!autoApproved) {
        approvalStatus = 'pending';
      }
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        text_content: textContent || null,
        media_url: mediaUrl && mediaUrl.length ? mediaUrl : null,
        visibility: visibility,
        feeling_id: feelingId,
        target_profile_id: isOwnPage ? null : targetProfileId,
        approval_status: approvalStatus,
      })
      .select('id, author_id, text_content, media_url, visibility, feeling_id, target_profile_id, approval_status, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      post: data,
      requires_approval: approvalStatus === 'pending',
    }, { status: 200 });
  } catch (err) {
    console.error('POST /api/posts error:', err);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
