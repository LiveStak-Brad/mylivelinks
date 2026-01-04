type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
};

async function requestJson<T>(url: string, init: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      ...init,
    });

    const data = (await response
      .clone()
      .json()
      .catch(() => null)) as T | null;

    if (!response.ok) {
      const errorMessage = (data as any)?.error || response.statusText || 'Request failed';
      return { ok: false, status: response.status, data, error: errorMessage };
    }

    return { ok: true, status: response.status, data };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error?.message || 'Network error',
    };
  }
}

export type SupportTicket = {
  id: string;
  reporter_profile_id: string;
  assigned_to: string | null;
  message: string;
  context: Record<string, unknown> | null;
  status: string;
  ai_summary?: Record<string, unknown> | null;
  ai_error?: string | null;
  created_at: string;
};

export type SupportIntakeResponse = {
  ok: boolean;
  ticket?: SupportTicket;
  ai?: {
    ok: boolean;
    model?: string;
    ms?: number;
    error?: string;
  };
  prompt?: {
    key: string | null;
    updatedAt: string | null;
  };
  error?: string;
};

export async function submitSupportTicket(payload: {
  message: string;
  context?: Record<string, unknown>;
}) {
  return requestJson<SupportIntakeResponse>('/api/support/intake', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type CompanionMessageResponse = {
  ok: boolean;
  sessionId: string;
  reply: string;
  exposureTips: string[];
  featureIdeas: string[];
  suggestSendToHuman: boolean;
  cooldownSeconds: number;
  usage: {
    usedToday: number;
    remainingToday: number;
    dailyLimit: number;
  };
  ai?: {
    ok: boolean;
    model?: string;
    ms?: number;
    error?: string;
  };
  error?: string;
  retryAfterSeconds?: number;
};

export async function postCompanionMessage(payload: {
  message: string;
  sessionId?: string;
  context?: Record<string, unknown>;
}) {
  return requestJson<CompanionMessageResponse>('/api/support/companion', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

