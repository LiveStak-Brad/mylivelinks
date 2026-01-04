const DISABLED_VALUES = new Set(['0', 'false', 'off', 'disabled', 'no']);

export const LINKLER_DISABLED_MESSAGE = 'Linkler is temporarily unavailable. Please try again later.';

export function isLinklerEnabled(): boolean {
  const raw = process.env.LINKLER_ENABLED;
  if (!raw) {
    return true;
  }
  return !DISABLED_VALUES.has(raw.trim().toLowerCase());
}

