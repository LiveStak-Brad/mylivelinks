import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required fields
    const requiredFields = [
      'display_name',
      'mll_username', 
      'email',
      'currently_streaming',
      'agrees_to_standards',
      'consent_transactional'
    ];
    
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== false) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check for duplicate submission within 24h
    const supabase = getSupabaseAdmin();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: existing } = await supabase
      .from('mll_pro_applications')
      .select('id')
      .eq('email', body.email)
      .gte('created_at', oneDayAgo)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted an application within the last 24 hours' },
        { status: 429 }
      );
    }

    // Collect metadata
    const meta = {
      user_agent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      submitted_at: new Date().toISOString(),
    };

    // Insert application
    const { data, error } = await supabase
      .from('mll_pro_applications')
      .insert({
        display_name: body.display_name,
        mll_username: body.mll_username,
        email: body.email,
        phone: body.phone || null,
        country: body.country || null,
        timezone: body.timezone || null,
        currently_streaming: body.currently_streaming,
        platforms: body.platforms || [],
        streaming_duration: body.streaming_duration || null,
        categories: body.categories || [],
        schedule: body.schedule || null,
        avg_stream_length: body.avg_stream_length || null,
        avg_viewers: body.avg_viewers || null,
        strengths: body.strengths || null,
        growth_plan: body.growth_plan || null,
        promotion_methods: body.promotion_methods || [],
        will_share_link: body.will_share_link || false,
        community_goal: body.community_goal || null,
        invited_already: body.invited_already || false,
        invited_count: body.invited_count || null,
        referral_info: body.referral_info || null,
        fit_reason: body.fit_reason || null,
        vod_links: body.vod_links || [],
        agrees_to_standards: body.agrees_to_standards,
        consent_transactional: body.consent_transactional,
        consent_updates: body.consent_updates || false,
        opt_out_marketing: body.opt_out_marketing || false,
        meta,
      })
      .select()
      .single();

    if (error) {
      console.error('[mll-pro/apply] Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      application_id: data.id,
      message: 'Application received. We\'ll reach out by email.',
    });

  } catch (error) {
    console.error('[mll-pro/apply] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
