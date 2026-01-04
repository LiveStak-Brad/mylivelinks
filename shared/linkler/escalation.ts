export type SupportTranscriptEntry = {
  role: 'user' | 'assistant';
  text: string;
  createdAt?: number;
};

export type LinklerEscalationReason =
  | 'emergency'
  | 'ai_unavailable'
  | 'ai_recommended'
  | 'user_requested'
  | 'linkler_disabled'
  | 'timeout';

const EMERGENCY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /suicid/i, label: 'suicide' },
  { pattern: /self[\s-]*harm/i, label: 'self-harm' },
  { pattern: /kill\s+(?:myself|me|us)/i, label: 'kill self' },
  { pattern: /hurt(?:ing)?\s+myself/i, label: 'hurt self' },
  { pattern: /fallen?\s+and\s+can['’]?t\s+get\s+up/i, label: 'fall emergency' },
  { pattern: /overdose/i, label: 'overdose' },
  { pattern: /threat(?:ening)?\s+(?:myself|others)/i, label: 'credible threat' },
  { pattern: /immediate\s+danger/i, label: 'immediate danger' },
  { pattern: /emergency/i, label: 'emergency' },
  { pattern: /cant\s+breathe/i, label: 'breathing issue' },
];

export function detectLinklerEmergency(message: string) {
  const normalized = message.trim().toLowerCase();
  if (!normalized) {
    return { isEmergency: false as const };
  }

  for (const { pattern, label } of EMERGENCY_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isEmergency: true as const,
        keyword: label,
      };
    }
  }

  return { isEmergency: false as const };
}

export function buildLinklerEscalationContext({
  sessionId,
  transcript,
  lastLinklerReply,
  reason,
  metadata,
}: {
  sessionId?: string;
  transcript?: SupportTranscriptEntry[];
  lastLinklerReply?: string | null;
  reason?: LinklerEscalationReason;
  metadata?: Record<string, unknown> | null;
}) {
  const serializedTranscript = (transcript ?? [])
    .slice(-6)
    .map((entry) => ({
      role: entry.role,
      text: entry.text,
    }));

  const context: Record<string, unknown> = {
    source: 'linkler-support',
    reason,
    sessionId,
    transcript: serializedTranscript,
    lastLinklerReply: lastLinklerReply || 'AI unavailable',
  };

  if (metadata && typeof metadata === 'object') {
    context.metadata = metadata;
  }

  return context;
}
