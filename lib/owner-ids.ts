const DEFAULT_OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818'];

function parseOwnerIdsEnv(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function getOwnerProfileIds(): string[] {
  const explicitIds = parseOwnerIdsEnv(process.env.OWNER_PROFILE_IDS);
  const singleId = process.env.OWNER_PROFILE_ID ? [process.env.OWNER_PROFILE_ID.trim()] : [];
  const combined = [...explicitIds, ...singleId, ...DEFAULT_OWNER_IDS];
  return Array.from(new Set(combined.filter(Boolean)));
}

export function isOwnerProfile(profileId?: string | null): boolean {
  if (!profileId) return false;
  return getOwnerProfileIds().includes(profileId);
}

export function assertOwnerProfile(profileId?: string | null) {
  if (!isOwnerProfile(profileId)) {
    throw new Error('FORBIDDEN');
  }
}

