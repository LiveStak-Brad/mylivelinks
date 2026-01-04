import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOwner, assertOwnerProfile } from '@/lib/rbac';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { addSupportMessage } from '@/lib/owner/support';

const paramsSchema = z.object({
  ticketId: z.string().uuid(),
});

const bodySchema = z.object({
  message: z.string().min(2).max(4000),
  kind: z.enum(['reply', 'internal_note']).default('reply'),
});

export async function POST(request: NextRequest, context: { params: { ticketId: string } }) {
  try {
    const user = await requireOwner(request);
    assertOwnerProfile(user.id);

    const params = paramsSchema.safeParse(context.params);
    if (!params.success) {
      return NextResponse.json({ ok: false, error: 'Invalid ticket id' }, { status: 400 });
    }

    let payload: z.infer<typeof bodySchema>;
    try {
      const json = await request.json();
      payload = bodySchema.parse(json);
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payload', details: err?.message ?? err },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient(request);
    const message = await addSupportMessage({
      supabase,
      ticketId: params.data.ticketId,
      senderProfileId: user.id,
      message: payload.message,
      kind: payload.kind,
    });

    return NextResponse.json({ ok: true, data: message }, { status: 201 });
  } catch (error: any) {
    const message = error?.message ?? 'Failed to add message';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
