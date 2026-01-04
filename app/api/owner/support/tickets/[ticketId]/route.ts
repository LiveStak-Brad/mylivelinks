import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOwner, assertOwnerProfile } from '@/lib/rbac';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupportTicketDetail, updateSupportTicket } from '@/lib/owner/support';

const ticketParamsSchema = z.object({
  ticketId: z.string().uuid(),
});

const patchSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'escalated']).optional(),
  assignToOwner: z.boolean().optional(),
});

export async function GET(request: NextRequest, context: { params: { ticketId: string } }) {
  try {
    const user = await requireOwner(request);
    assertOwnerProfile(user.id);

    const params = ticketParamsSchema.safeParse(context.params);
    if (!params.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid ticket id' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient(request);
    const ticket = await getSupportTicketDetail({
      supabase,
      ticketId: params.data.ticketId,
    });

    if (!ticket) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: ticket });
  } catch (error: any) {
    const message = error?.message ?? 'Failed to fetch ticket';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, context: { params: { ticketId: string } }) {
  try {
    const user = await requireOwner(request);
    assertOwnerProfile(user.id);

    const params = ticketParamsSchema.safeParse(context.params);
    if (!params.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid ticket id' },
        { status: 400 }
      );
    }

    let body;
    try {
      const json = await request.json();
      body = patchSchema.parse(json);
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payload', details: err?.message ?? err },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient(request);
    await updateSupportTicket({
      supabase,
      ticketId: params.data.ticketId,
      status: body.status,
      assignToOwner: body.assignToOwner,
    });

    const detail = await getSupportTicketDetail({
      supabase,
      ticketId: params.data.ticketId,
    });

    return NextResponse.json({ ok: true, data: detail });
  } catch (error: any) {
    const message = error?.message ?? 'Failed to update ticket';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
