import { NextRequest } from 'next/server';
import { requireAdmin, adminJson, adminError, generateReqId } from '@/lib/admin';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/admin/audit-test
 * Test endpoint for admin audit logging
 * Creates an audit log entry via RPC and returns the log ID
 */
export async function POST(request: NextRequest) {
  const reqId = generateReqId();

  try {
    const { user, profileId } = await requireAdmin(request);
    const supabase = createRouteHandlerClient(request);

    // Parse request body (optional test data)
    let testData: any = {};
    try {
      testData = await request.json();
    } catch {
      testData = {};
    }

    // Log the test action
    const { error: logError } = await supabase.rpc('admin_log_action', {
      p_action: 'test_audit_log',
      p_resource_type: 'test',
      p_resource_id: reqId,
      p_metadata: {
        test: true,
        timestamp: new Date().toISOString(),
        reqId,
        requestData: testData,
      },
    });

    if (logError) {
      console.error('[API /admin/audit-test] RPC error:', logError);
      return adminError(reqId, 'Failed to create audit log', 500, { rpcError: logError.message });
    }

    const admin = getSupabaseAdmin();
    const { data: logRow } = await admin
      .from('admin_audit_logs')
      .select('id')
      .eq('actor_profile_id', user.id)
      .eq('action', 'test_audit_log')
      .contains('metadata', { reqId })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return adminJson(
      reqId,
      {
        message: 'Audit log created successfully',
        logId: logRow?.id ?? null,
        actor: {
          userId: user.id,
          profileId,
        },
        action: 'test_audit_log',
        targetType: 'test',
        targetId: reqId,
      },
      200
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') {
      return adminError(reqId, 'Unauthorized', 401);
    }
    if (msg === 'FORBIDDEN') {
      return adminError(reqId, 'Forbidden', 403);
    }
    console.error('[API /admin/audit-test] Exception:', err);
    return adminError(reqId, 'Internal server error', 500);
  }
}


