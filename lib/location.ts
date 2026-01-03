export type NearbyMode = 'zip' | 'city' | 'region';

export interface ProfileLocation {
  zip?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  label?: string | null;
  hidden?: boolean | null;
  showZip?: boolean | null;
  updatedAt?: string | null;
}

export interface LocationDisplayOptions {
  includeZip?: boolean;
  fallback?: string;
  forceLabel?: boolean;
  includeCountry?: boolean;
  isSelf?: boolean;
}

export const LOCATION_COPY = {
  helper: 'Manual location. No GPS tracking.',
  disclaimer: "Location is self-reported. Don't share your exact address.",
  nearbyRequiresZip: 'Set your ZIP to use Nearby filters.',
};

export const NEARBY_MODES: { id: NearbyMode; label: string; description: string }[] = [
  { id: 'region', label: 'Region', description: 'Matches state/region' },
  { id: 'city', label: 'City', description: 'Matches city + region' },
  { id: 'zip', label: 'ZIP', description: 'Exact ZIP match' },
];

export function formatLocationDisplay(
  location: ProfileLocation | null | undefined,
  options: LocationDisplayOptions = {}
): string | null {
  if (!location) return options.fallback ?? null;

  const { includeZip = false, fallback = null, forceLabel = false, includeCountry = false } = options;

  if (location.hidden && !options.isSelf) {
    return fallback;
  }

  if (location.label) {
    const trimmedLabel = location.label.trim();
    if (forceLabel || trimmedLabel.length > 0) {
      return trimmedLabel;
    }
  }

  const parts = [];

  if (location.city) {
    parts.push(location.city);
  }

  if (location.region) {
    parts.push(location.region);
  }

  if (includeCountry && location.country) {
    parts.push(location.country);
  }

  if (includeZip && location.showZip && location.zip) {
    parts.push(location.zip);
  }

  const display = parts.filter(Boolean).join(', ');
  return display || fallback;
}

export function canShowLocation(location: ProfileLocation | null | undefined, isSelf = false): boolean {
  if (!location) return false;
  if (location.hidden && !isSelf) return false;
  return Boolean(location.city || location.region || location.label);
}

export function getDefaultNearbyValue(location: ProfileLocation | null | undefined, mode: NearbyMode): string | null {
  if (!location) return null;
  switch (mode) {
    case 'zip':
      return location.zip ?? null;
    case 'city':
      if (location.city && location.region) {
        return `${location.city},${location.region}`;
      }
      return null;
    case 'region':
    default:
      return location.region ?? null;
  }
}
