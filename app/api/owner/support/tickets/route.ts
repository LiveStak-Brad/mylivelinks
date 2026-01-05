import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { fetchSupportBadges, listSupportTickets } from '@/lib/owner/support';
import type { SupportTicketFilters } from '@/types/support';

const querySchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'escalated', 'all']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical', 'all']).optional(),
  category: z.string().max(64).optional(),
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(0).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(1000).optional(),
  summaryOnly: z.coerce.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const parsed = querySchema.safeParse({
      ...rawParams,
      summaryOnly:
        rawParams.summaryOnly ??
        rawParams.summary ??
        (rawParams.limit === '0' ? 'true' : undefined),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid query parameters',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient(request);
    const filters: SupportTicketFilters = {
      status: parsed.data.status ?? 'all',
      severity: parsed.data.severity ?? 'all',
      category: parsed.data.category ?? null,
      search: parsed.data.search ?? null,
    };

    if (parsed.data.summaryOnly) {
      const badges = await fetchSupportBadges(supabase);
      return NextResponse.json({
        ok: true,
        data: {
          tickets: [],
          badges,
          total: 0,
          limit: 0,
          offset: 0,
        },
      });
    }

    const result = await listSupportTickets({
      supabase,
      filters,
      limit: parsed.data.limit ?? 25,
      offset: parsed.data.offset ?? 0,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    const message = error?.message ?? 'Failed to load support tickets';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status }
    );
  }
}
