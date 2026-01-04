import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOwner } from '@/lib/admin';
import { getLinklerModelSettings, setLinklerModelSettings } from '@/lib/linkler/prompt';

const bodySchema = z.object({
  assistantModel: z.string().min(3, 'assistantModel is required').max(200),
  guardModel: z.string().min(3, 'guardModel is required').max(200),
});

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    await requireOwner(request);
    const settings = await getLinklerModelSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { profileId } = await requireOwner(request);
    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payload', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const settings = await setLinklerModelSettings({
      assistantModel: parsed.data.assistantModel,
      guardModel: parsed.data.guardModel,
      updatedBy: profileId,
    });

    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    if (err instanceof Error && (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN')) {
      return authErrorToResponse(err);
    }
    console.error('[API] Failed to update Linkler model settings', err);
    return NextResponse.json({ ok: false, error: 'Failed to update model settings' }, { status: 500 });
  }
}
