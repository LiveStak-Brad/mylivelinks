import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callGuardJSON } from '@/lib/ai/ollama';
import { getLinklerModelSettings } from '@/lib/linkler/prompt';
import { createRouteHandlerClient } from '@/lib/supabase-server';

const bodySchema = z.object({
  text: z.string().min(1, 'text is required'),
  context: z.record(z.any()).optional(),
});

type GuardShape = {
  labels: string[];
  confidence: number;
  notes?: string;
};

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: 'Invalid payload', details: error?.message ?? error },
      { status: 400 }
    );
  }

  const settings = await getLinklerModelSettings().catch((err) => {
    console.warn('[Linkler][moderation-classify] failed to load model settings, using fallback:', err);
    return null;
  });

  const guardResult = await callGuardJSON<GuardShape>({
    text: parsed.text,
    context: parsed.context ?? undefined,
    traceLabel: 'moderation-classify',
    model: settings?.guardModel,
  });

  return NextResponse.json(
    {
      ok: guardResult.ok,
      model: guardResult.model,
      ms: guardResult.ms,
      classification: guardResult.output,
      error: guardResult.ok ? undefined : guardResult.error,
    },
    { status: guardResult.ok ? 200 : 503 }
  );
}
