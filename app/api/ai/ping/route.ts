import { NextRequest, NextResponse } from 'next/server';
import { pingOllama } from '@/lib/ai/ollama';
import { getLinklerRuntimeConfig } from '@/lib/linkler/prompt';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const modelParam = url.searchParams.get('model')?.trim() || undefined;

  const config = await getLinklerRuntimeConfig().catch((err) => {
    console.warn('[Linkler][ping] failed to load config metadata:', err);
    return null;
  });

  const resolvedModel = modelParam && modelParam.length ? modelParam : config?.settings.assistantModel;

  try {
    const result = await pingOllama(resolvedModel);
    const ok = result.ok && result.output?.pong === true;

    return NextResponse.json(
      {
        ok,
        model: result.model,
        ms: result.ms,
        prompt: config?.prompt
          ? { key: config.prompt.key, updatedAt: config.prompt.updatedAt }
          : { key: null, updatedAt: null },
        models: config
          ? {
              assistant: config.settings.assistantModel,
              guard: config.settings.guardModel,
            }
          : null,
        error: ok ? undefined : result.error ?? 'Unexpected Ollama response',
      },
      { status: ok ? 200 : 503 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        model: resolvedModel ?? process.env.OLLAMA_ASSISTANT_MODEL ?? 'llama3.3:latest',
        ms: 0,
        prompt: config?.prompt
          ? { key: config.prompt.key, updatedAt: config.prompt.updatedAt }
          : { key: null, updatedAt: null },
        models: config
          ? {
              assistant: config.settings.assistantModel,
              guard: config.settings.guardModel,
            }
          : null,
        error: error?.message ?? 'Failed to ping Ollama',
      },
      { status: 500 }
    );
  }
}
