import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import {
  getLinklerPrompt,
  getLinklerModelSettings,
  __resetLinklerPromptCacheForTests,
} from './prompt';

jest.mock('@/lib/supabase-admin', () => {
  return {
    getSupabaseAdmin: jest.fn(),
  };
});

const { getSupabaseAdmin } = require('@/lib/supabase-admin');

function mockSupabaseWithResponse(response: { data: any; error: any }) {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(response),
    upsert: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };

  const client = {
    from: jest.fn().mockReturnValue(queryBuilder),
  };

  (getSupabaseAdmin as jest.Mock).mockReturnValue(client);
  return { client, queryBuilder };
}

describe('getLinklerPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetLinklerPromptCacheForTests();
  });

  it('returns fallback prompt when database entry is missing', async () => {
    mockSupabaseWithResponse({ data: null, error: null });

    const prompt = await getLinklerPrompt({ forceRefresh: true });

    expect(prompt.key).toBe('linkler_system');
    expect(prompt.content).toContain('What Linkler Is');
    expect(prompt.systemPrompt).toContain('Linkler Security Firewall');
    expect(prompt.source).toBe('fallback');
  });

  it('caches prompt results within TTL', async () => {
    const { client } = mockSupabaseWithResponse({
      data: {
        key: 'linkler_system',
        content_md: 'cached prompt text',
        updated_at: '2025-01-01T00:00:00Z',
        updated_by: 'owner',
      },
      error: null,
    });

    const first = await getLinklerPrompt({ forceRefresh: true });
    const second = await getLinklerPrompt();

    expect(first.content).toBe('cached prompt text');
    expect(second.content).toBe('cached prompt text');
    expect(client.from).toHaveBeenCalledTimes(1);
  });
});

describe('getLinklerModelSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetLinklerPromptCacheForTests();
  });

  it('falls back to defaults when no DB row exists', async () => {
    mockSupabaseWithResponse({ data: null, error: null });

    const settings = await getLinklerModelSettings({ forceRefresh: true });

    expect(settings.assistantModel).toBeDefined();
    expect(settings.guardModel).toBeDefined();
    expect(settings.source).toBe('fallback');
  });
});
