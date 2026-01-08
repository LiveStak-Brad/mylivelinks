import { createRouteHandlerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

function parseOwnerInboxProfileIds(): string[] {
  const fromEnv = (process.env.OWNER_REPORT_INBOX_PROFILE_IDS || '').trim();
  const fallbackOwner = (process.env.OWNER_PROFILE_ID || '').trim();

  const raw = fromEnv
    ? fromEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : fallbackOwner
      ? [fallbackOwner]
      : [];

  return Array.from(new Set(raw));
}

function buildBaseUrl(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  if (!host) return null;
  return `${proto}://${host}`;
}

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/**
 * POST /api/reports/create
 * Create a content report (user, stream, profile, chat)
 * Body: {
 *   report_type: 'user' | 'stream' | 'profile' | 'chat',
 *   reported_user_id?: string,
 *   report_reason: string,
 *   report_details?: string,
 *   context_details?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    
    // Parse request body
    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'INVALID_TARGET' }, { status: 400 });
    }
    const {
      report_type,
      reported_user_id,
      report_reason,
      report_details,
      context_details,
    } = body;
    
    // Validate required fields
    if (!report_type || !report_reason) {
      return NextResponse.json({ error: 'INVALID_TARGET' }, { status: 400 });
    }
    
    // Validate report_type
    const validReportTypes = ['user', 'stream', 'profile', 'chat'];
    if (!validReportTypes.includes(report_type)) {
      return NextResponse.json({ error: 'INVALID_TARGET' }, { status: 400 });
    }

    // Validate/normalize target
    const reportedUserId = isUuid(reported_user_id) ? reported_user_id : null;
    const hasContext = typeof context_details === 'string' && context_details.trim().length > 0;
    const requiresUserTarget = report_type === 'user' || report_type === 'profile';

    if (requiresUserTarget && !reportedUserId) {
      return NextResponse.json({ error: 'INVALID_TARGET' }, { status: 400 });
    }

    if (!reportedUserId && !hasContext) {
      return NextResponse.json({ error: 'INVALID_TARGET' }, { status: 400 });
    }
    
    // Check rate limit (10 reports per hour per user) - deterministic retry_after_seconds.
    try {
      const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { count, error: countError } = await supabase
        .from('content_reports')
        .select('id', { count: 'exact', head: true })
        .eq('reporter_id', user.id)
        .gte('created_at', oneHourAgoIso);

      if (countError) {
        console.error('[REPORT] rate_limit_count_error', {
          reporter_id: user.id,
          report_type,
          code: (countError as any)?.code ?? null,
          message: countError.message,
        });
      } else if ((count ?? 0) >= 10) {
        let retryAfterSeconds = 60;
        const { data: oldest, error: oldestError } = await supabase
          .from('content_reports')
          .select('created_at')
          .eq('reporter_id', user.id)
          .gte('created_at', oneHourAgoIso)
          .order('created_at', { ascending: true })
          .limit(1);

        if (oldestError) {
          console.error('[REPORT] rate_limit_oldest_error', {
            reporter_id: user.id,
            report_type,
            code: (oldestError as any)?.code ?? null,
            message: oldestError.message,
          });
        } else {
          const oldestCreatedAt = (oldest ?? [])[0]?.created_at ? new Date((oldest ?? [])[0].created_at).getTime() : null;
          if (oldestCreatedAt) {
            const nextAllowedAt = oldestCreatedAt + 60 * 60 * 1000;
            retryAfterSeconds = Math.max(1, Math.ceil((nextAllowedAt - Date.now()) / 1000));
          }
        }

        return NextResponse.json(
          { error: 'RATE_LIMITED', retry_after_seconds: retryAfterSeconds },
          { status: 429 }
        );
      }
    } catch (rateLimitException: any) {
      console.error('[REPORT] rate_limit_exception', {
        reporter_id: user.id,
        report_type,
        message: rateLimitException?.message ?? String(rateLimitException),
      });
      // Do not block legitimate reports on rate limiter failure.
    }
    
    // Prevent self-reporting
    if (reportedUserId && reportedUserId === user.id) {
      return NextResponse.json({ error: 'INVALID_TARGET' }, { status: 400 });
    }
    
    // Insert report
    const { data: report, error: insertError } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        report_type,
        report_reason,
        report_details: report_details || null,
        context_details: hasContext ? String(context_details) : null,
        status: 'pending',
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[REPORT] insert_error', {
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        report_type,
        report_reason,
        code: (insertError as any)?.code ?? null,
        message: insertError.message,
      });
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }
    
    console.log('[REPORT] created', {
      report_id: report.id,
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      report_type,
      report_reason,
    });

    // Fan-out to owner inbox DMs (MyLiveLinks + CannaStreams) so reports are seen quickly.
    // This must NEVER block report creation.
    try {
      const ownerInboxProfileIds = parseOwnerInboxProfileIds();
      const baseUrl = buildBaseUrl(request);

      if (ownerInboxProfileIds.length === 0) {
        console.warn('[REPORT] No OWNER_REPORT_INBOX_PROFILE_IDS configured; skipping inbox fan-out', {
          report_id: report.id,
        });
      } else {
        const contextJson = {
          kind: 'content_report',
          report_id: String(report.id),
          report_type,
          report_reason,
          reported_user_id: reported_user_id || null,
          created_at: report.created_at ?? null,
          owner_panel_url: baseUrl ? `${baseUrl}/owner/reports?report=${encodeURIComponent(String(report.id))}` : null,
        };

        const bodyText = `🚩 New report\n\nType: ${report_type}\nReason: ${report_reason}\nReport ID: ${String(report.id)}\n\nContext: ${JSON.stringify(contextJson)}`;

        await Promise.all(
          ownerInboxProfileIds.map(async (ownerProfileId) => {
            if (!ownerProfileId || ownerProfileId === user.id) return;

            // Create a 1:1 conversation with the owner inbox.
            const { data: conversationId, error: conError } = await supabase.rpc('get_or_create_dm_conversation', {
              p_other_profile_id: ownerProfileId,
            });

            if (conError || !conversationId) {
              console.error('[REPORT] Inbox fan-out: failed to get/create conversation', {
                report_id: report.id,
                ownerProfileId,
                error: conError?.message ?? conError,
              });
              return;
            }

            const requestId = `report:${String(report.id)}:${ownerProfileId}`;

            const { error: msgError } = await supabase.from('messages').insert({
              conversation_id: conversationId,
              sender_id: user.id,
              type: 'system',
              body_text: bodyText,
              request_id: requestId,
            });

            if (msgError) {
              console.error('[REPORT] Inbox fan-out: failed to insert DM message', {
                report_id: report.id,
                ownerProfileId,
                conversationId,
                error: msgError.message,
              });
            }
          })
        );
      }
    } catch (notifyErr: any) {
      console.error('[REPORT] Inbox fan-out exception (non-blocking):', notifyErr);
    }
    
    // TODO: Send notification to admin/moderation team
    // This could be an email, Slack notification, or database trigger
    
    return NextResponse.json({ report_id: report.id }, { status: 201 });
    
  } catch (error: any) {
    console.error('[REPORT] exception', {
      message: error?.message ?? String(error),
      stack: error?.stack ?? null,
    });
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
  }
}










