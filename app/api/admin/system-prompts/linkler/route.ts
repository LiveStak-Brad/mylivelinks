import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOwner } from '@/lib/admin';
import { getLinklerRuntimeConfig, setLinklerPrompt } from '@/lib/linkler/prompt';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

const putSchema = z.object({
  content: z.string().min(20, 'content must be at least 20 characters'),
});

export async function GET(request: NextRequest) {
  try {
    await requireOwner(request);
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    const config = await getLinklerRuntimeConfig({ forceRefresh });
    return NextResponse.json({ ok: true, prompt: config.prompt, settings: config.settings });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { profileId } = await requireOwner(request);
    const payload = putSchema.safeParse(await request.json());

    if (!payload.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payload', issues: payload.error.flatten() },
        { status: 400 }
      );
    }

    const prompt = await setLinklerPrompt(payload.data.content.trim(), profileId);
    return NextResponse.json({ ok: true, prompt });
  } catch (err) {
    if (err instanceof Error && (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN')) {
      return authErrorToResponse(err);
    }

    console.error('[API] Failed to update Linkler prompt', err);
    return NextResponse.json({ ok: false, error: 'Failed to update prompt' }, { status: 500 });
  }
}
