import { NextRequest } from 'next/server';
import { requireAdmin, adminJson, adminError, generateReqId } from '@/lib/admin';
import { createRouteHandlerClient } from '@/lib/supabase-server';

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
    const { data: logId, error: logError } = await supabase.rpc('admin_log_action', {
      p_action: 'test_audit_log',
      p_target_type: 'test',
      p_target_id: reqId,
      p_metadata: {
        test: true,
        timestamp: new Date().toISOString(),
        requestData: testData,
      },
    });

    if (logError) {
      console.error('[API /admin/audit-test] RPC error:', logError);
      return adminError(reqId, 'Failed to create audit log', 500, { rpcError: logError.message });
    }

    return adminJson(
      reqId,
      {
        message: 'Audit log created successfully',
        logId,
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


