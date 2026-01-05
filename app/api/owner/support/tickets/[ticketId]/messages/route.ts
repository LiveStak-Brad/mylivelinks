import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { addSupportMessage } from '@/lib/owner/support';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const paramsSchema = z.object({
  ticketId: z.string().uuid(),
});

const bodySchema = z.object({
  message: z.string().min(2).max(4000),
  kind: z.enum(['reply', 'internal_note']).default('reply'),
});

export async function POST(request: NextRequest, context: { params: { ticketId: string } }) {
  try {
    const { user } = await requireAdmin(request);

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

    if (payload.kind === 'reply') {
      const { data: ticketRow, error: ticketError } = await supabase
        .from('support_tickets')
        .select('reporter_profile_id')
        .eq('id', params.data.ticketId)
        .single();

      if (ticketError || !ticketRow?.reporter_profile_id) {
        return NextResponse.json({ ok: false, error: ticketError?.message ?? 'Unable to resolve ticket recipient' }, { status: 500 });
      }

      const reporterId = String(ticketRow.reporter_profile_id);
      const supportAppId =
        (process.env.MYLIVELINKS_APP_ID && process.env.MYLIVELINKS_APP_ID.trim()) ||
        '0b47a2d7-43fb-4d38-b321-2d5d0619aabf';

      const admin = getSupabaseAdmin();
      await admin.from('instant_messages').insert({
        sender_id: supportAppId,
        recipient_id: reporterId,
        content: payload.message,
      });

      const notifMessage = payload.message.length > 160 ? `${payload.message.slice(0, 157)}...` : payload.message;
      await admin.from('notifications').insert({
        recipient_id: reporterId,
        actor_id: supportAppId,
        type: 'support',
        entity_type: 'support',
        entity_id: params.data.ticketId,
        message: `Support: ${notifMessage}`,
        read: false,
      });
    }

    return NextResponse.json({ ok: true, data: message }, { status: 201 });
  } catch (error: any) {
    const message = error?.message ?? 'Failed to add message';
    const status = message === 'FORBIDDEN' ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
