import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { callAssistantJSON } from '@/lib/ai/ollama';
import {
  getLinklerModelSettings,
  getLinklerPrompt,
  getLinklerRuntimeConfig,
} from '@/lib/linkler/prompt';

const bodySchema = z.object({
  message: z.string().min(1, 'message is required').max(1000),
  sessionId: z.string().uuid().optional(),
  context: z.record(z.any()).optional(),
});

type CompanionAIShape = {
  reply: string;
  exposureTips?: string[];
  featureIdeas?: string[];
  suggestSendToHuman?: boolean;
};

const DEFAULT_DAILY_LIMIT = Number(process.env.COMPANION_DAILY_LIMIT ?? 25);
const DEFAULT_COOLDOWN_SECONDS = Number(process.env.COMPANION_COOLDOWN_SECONDS ?? 30);

function sanitizeContext(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = bodySchema.parse(await request.json());
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: 'Invalid payload', details: error?.message ?? error },
      { status: 400 }
    );
  }

  const dailyLimit = DEFAULT_DAILY_LIMIT;
  const cooldownSeconds = DEFAULT_COOLDOWN_SECONDS;
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentMessages } = await supabase
    .from('support_companion_messages')
    .select('role, created_at')
    .eq('profile_id', user.id)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(100);

  const sentToday = (recentMessages ?? []).filter((item) => item.role === 'user');
  if (sentToday.length >= dailyLimit) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Daily companion chat limit reached',
        retryAfterSeconds: 3600,
      },
      { status: 429 }
    );
  }

  const lastUserMessage = sentToday[0];
  if (lastUserMessage) {
    const lastAt = new Date(lastUserMessage.created_at).getTime();
    const diffSeconds = (Date.now() - lastAt) / 1000;
    if (diffSeconds < cooldownSeconds) {
      return NextResponse.json(
        {
          ok: false,
          error: `Please wait ${Math.ceil(cooldownSeconds - diffSeconds)}s before sending another message.`,
          retryAfterSeconds: Math.ceil(cooldownSeconds - diffSeconds),
        },
        { status: 429 }
      );
    }
  }

  const sessionId = payload.sessionId ?? randomUUID();

  const { data: history } = await supabase
    .from('support_companion_messages')
    .select('role, message')
    .eq('profile_id', user.id)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(6);

  const context = sanitizeContext(payload.context);

  const { error: logError } = await supabase.from('support_companion_messages').insert({
    profile_id: user.id,
    session_id: sessionId,
    role: 'user',
    message: payload.message,
    metadata: context,
  });

  if (logError) {
    return NextResponse.json({ ok: false, error: logError.message }, { status: 500 });
  }

  const conversationSnippet =
    history && history.length
      ? history.map((msg) => `${msg.role.toUpperCase()}: ${msg.message}`).join('\n')
      : 'No previous messages.';

  const config = await getLinklerRuntimeConfig().catch((err) => {
    console.warn('[Linkler][companion] failed to load config, using fallback:', err);
    return null;
  });
  const linklerPrompt = config?.prompt ?? (await getLinklerPrompt());
  const linklerSettings = config?.settings ?? (await getLinklerModelSettings());

  const aiResult = await callAssistantJSON<CompanionAIShape>({
    prompt: [
      'Follow your Linkler policies from the system prompt and reply as the in-app companion.',
      'Respond strictly with JSON matching { reply, exposureTips, featureIdeas, suggestSendToHuman }.',
      'Keep reply under 80 words, stay positive, and encourage human support when uncertain.',
      `Conversation so far:\n${conversationSnippet}`,
      `Latest user message: """${payload.message.trim()}"""`,
    ].join('\n\n'),
    context: {
      ...(context ?? {}),
      sessionId,
    },
    temperature: 0.4,
    maxTokens: 350,
    systemPrompt: linklerPrompt.systemPrompt,
    traceLabel: 'companion-chat',
    maxRetries: 1,
    model: linklerSettings.assistantModel,
  });

  const fallbackReply =
    'Linkler is processing a lot right now. Please tap "Send to human support" and our team will help directly.';

  const replyPayload = aiResult.ok && aiResult.output ? aiResult.output : null;

  const finalReply = replyPayload?.reply?.trim() || fallbackReply;
  const exposureTips = replyPayload?.exposureTips ?? [];
  const featureIdeas = replyPayload?.featureIdeas ?? [];
  const suggestHuman = replyPayload?.suggestSendToHuman !== false;

  await supabase.from('support_companion_messages').insert({
    profile_id: user.id,
    session_id: sessionId,
    role: 'assistant',
    message: finalReply,
    metadata: {
      exposureTips,
      featureIdeas,
      suggestSendToHuman: suggestHuman,
      model: aiResult.model,
      ms: aiResult.ms,
      error: aiResult.ok ? null : aiResult.error,
      system_prompt_key: linklerPrompt.key,
      system_prompt_updated_at: linklerPrompt.updatedAt,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      sessionId,
      reply: finalReply,
      exposureTips,
      featureIdeas,
      suggestSendToHuman: suggestHuman,
      cooldownSeconds,
      usage: {
        usedToday: sentToday.length + 1,
        remainingToday: Math.max(0, dailyLimit - (sentToday.length + 1)),
        dailyLimit,
      },
      ai: {
        ok: aiResult.ok,
        model: aiResult.model,
        ms: aiResult.ms,
        error: aiResult.ok ? undefined : aiResult.error,
      },
    },
    { status: aiResult.ok ? 200 : 207 }
  );
}
