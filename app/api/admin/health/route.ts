import { NextRequest } from 'next/server';
import { requireAdmin, adminJson, adminError, generateReqId } from '@/lib/admin';

/**
 * GET /api/admin/health
 * Simple health check endpoint for admin authentication
 * Returns 200 for admins, 401/403 for non-admins
 */
export async function GET(request: NextRequest) {
  const reqId = generateReqId();

  try {
    const { user, profileId } = await requireAdmin(request);

    return adminJson(
      reqId,
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        admin: {
          userId: user.id,
          profileId,
          email: user.email,
        },
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
    console.error('[API /admin/health] Exception:', err);
    return adminError(reqId, 'Internal server error', 500);
  }
}


