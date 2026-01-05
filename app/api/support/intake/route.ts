import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { callAssistantJSON } from '@/lib/ai/ollama';
import {
  getLinklerModelSettings,
  getLinklerPrompt,
  getLinklerRuntimeConfig,
} from '@/lib/linkler/prompt';
import { isLinklerEnabled, LINKLER_DISABLED_MESSAGE } from '@/lib/linkler/flags';

const bodySchema = z.object({
  message: z.string().min(4, 'message is required'),
  context: z.record(z.any()).optional(),
});

const SUPPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SUPPORT_COOLDOWN_SECONDS = toPositiveInt(process.env.SUPPORT_COOLDOWN_SECONDS, 1);

type SupportAIShape = {
  summary: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  followups: string[];
};

function sanitizeContext(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!isLinklerEnabled()) {
    return NextResponse.json({ ok: false, error: LINKLER_DISABLED_MESSAGE }, { status: 503 });
  }

  const supabase = createRouteHandlerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let parsed;
  try {
    const body = await request.json();
    parsed = bodySchema.parse(body);
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: 'Invalid payload', details: error?.message ?? error },
      { status: 400 }
    );
  }

  const context = sanitizeContext(parsed.context);
  const assignedTo = process.env.OWNER_PROFILE_ID ?? null;

  const sinceIso = new Date(Date.now() - SUPPORT_WINDOW_MS).toISOString();
  const { data: recentTickets } = await supabase
    .from('support_tickets')
    .select('created_at')
    .eq('reporter_profile_id', user.id)
    .eq('source', 'support')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(1);

  const lastTicket = recentTickets?.[0];
  if (lastTicket?.created_at) {
    const lastAt = new Date(lastTicket.created_at).getTime();
    const diffSeconds = (Date.now() - lastAt) / 1000;
    if (diffSeconds < SUPPORT_COOLDOWN_SECONDS) {
      const retryAfterSeconds = Math.max(1, Math.ceil(SUPPORT_COOLDOWN_SECONDS - diffSeconds));
      return NextResponse.json(
        {
          ok: false,
          error: `Please wait ${retryAfterSeconds}s before sending another support request.`,
          retryAfterSeconds,
        },
        { status: 429 }
      );
    }
  }

  const config = await getLinklerRuntimeConfig().catch((err) => {
    console.warn('[Linkler][support-intake] failed to load config, using fallback:', err);
    return null;
  });

  const linklerPrompt = config?.prompt ?? (await getLinklerPrompt());
  const linklerSettings = config?.settings ?? (await getLinklerModelSettings());

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      reporter_profile_id: user.id,
      message: parsed.message,
      context,
      assigned_to: assignedTo,
      source: 'support',
    })
    .select('*')
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json(
      { ok: false, error: ticketError?.message ?? 'Failed to create ticket' },
      { status: 500 }
    );
  }

  // Store the initial user message in support_messages for auditing.
  await supabase.from('support_messages').insert({
    ticket_id: ticket.id,
    sender_profile_id: user.id,
    role: 'user',
    message: parsed.message,
    metadata: context,
  });

  const aiResult = await callAssistantJSON<SupportAIShape>({
    prompt: [
      'Summarize the following support request as JSON with keys summary, category, severity, followups (array).',
      'severity must be one of: low, medium, high, based on urgency.',
      'Provide concise human-ready values.',
      `User message:\n"""${parsed.message.trim()}"""`,
    ].join('\n\n'),
    context: context ?? undefined,
    systemPrompt: linklerPrompt.systemPrompt,
    traceLabel: 'support-intake',
    maxRetries: 1,
    model: linklerSettings.assistantModel,
  });

  if (aiResult.ok && aiResult.output) {
    await supabase
      .from('support_tickets')
      .update({
        ai_summary: aiResult.output,
        ai_model: aiResult.model,
        ai_duration_ms: aiResult.ms,
        ai_error: null,
      })
      .eq('id', ticket.id);

    const formattedSummary = [
      `Summary: ${aiResult.output.summary ?? 'N/A'}`,
      `Category: ${aiResult.output.category ?? 'N/A'}`,
      `Severity: ${aiResult.output.severity ?? 'N/A'}`,
      aiResult.output.followups?.length ? `Follow ups: ${aiResult.output.followups.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      role: 'assistant',
      sender_profile_id: null,
      message: formattedSummary,
      metadata: {
        source: 'linkler-ai',
        summary: aiResult.output,
        model: aiResult.model,
        ms: aiResult.ms,
        prompt_key: linklerPrompt.key ?? null,
        prompt_updated_at: linklerPrompt.updatedAt ?? null,
      },
    });
  } else {
    await supabase
      .from('support_tickets')
      .update({
        ai_error: aiResult.error ?? 'Assistant unavailable',
        ai_model: aiResult.model,
      })
      .eq('id', ticket.id);
  }

  const responseTicket = {
    ...ticket,
    ai_summary: aiResult.ok ? aiResult.output ?? ticket.ai_summary : ticket.ai_summary,
    ai_model: aiResult.model ?? ticket.ai_model,
    ai_duration_ms: aiResult.ms ?? ticket.ai_duration_ms,
    ai_error: aiResult.ok ? null : aiResult.error ?? ticket.ai_error,
  };

  return NextResponse.json(
    {
      ok: true,
      ticket: responseTicket,
      prompt: linklerPrompt
        ? { key: linklerPrompt.key, updatedAt: linklerPrompt.updatedAt }
        : { key: null, updatedAt: null },
      ai: {
        ok: aiResult.ok,
        model: aiResult.model,
        ms: aiResult.ms,
        output: aiResult.output,
        error: aiResult.ok ? undefined : aiResult.error,
      },
    },
    { status: 201 }
  );
}
