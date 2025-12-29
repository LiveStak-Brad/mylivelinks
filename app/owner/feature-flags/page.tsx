'use client';

import { useEffect, useState } from 'react';
import { OwnerPanelShell } from '@/components/owner/OwnerPanelShell';
import Card from '@/components/owner/ui-kit/Card';
import {
  Radio,
  Gift,
  MessageSquare,
  Swords,
  DollarSign,
  AlertTriangle,
  Info,
  Clock,
  User,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  lastChangedBy: string | null;
  lastChangedAt: string | null;
  category: 'core' | 'monetization' | 'social';
}

// ============================================================================
// Mock Data (placeholder for actual API calls)
// ============================================================================

const MOCK_FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: 'live_streaming',
    name: 'Live Streaming',
    description:
      'Enables users to start live streams and viewers to watch. Disabling will prevent new streams from starting.',
    icon: Radio,
    enabled: true,
    lastChangedBy: 'owner@mylivelinks.com',
    lastChangedAt: '2025-12-15T10:30:00Z',
    category: 'core',
  },
  {
    id: 'gifting',
    name: 'Gifting',
    description:
      'Allows viewers to send gifts to streamers. Disabling will hide gift buttons and prevent transactions.',
    icon: Gift,
    enabled: true,
    lastChangedBy: 'owner@mylivelinks.com',
    lastChangedAt: '2025-12-10T14:20:00Z',
    category: 'monetization',
  },
  {
    id: 'chat',
    name: 'Chat',
    description:
      'Enables chat messages in live streams. Disabling will hide chat UI and prevent message sending.',
    icon: MessageSquare,
    enabled: true,
    lastChangedBy: null,
    lastChangedAt: null,
    category: 'social',
  },
  {
    id: 'battles',
    name: 'Battles',
    description:
      'Enables battle mode for competitive streams. Disabling will prevent new battles from starting.',
    icon: Swords,
    enabled: true,
    lastChangedBy: 'owner@mylivelinks.com',
    lastChangedAt: '2025-11-28T09:15:00Z',
    category: 'core',
  },
  {
    id: 'payouts',
    name: 'Payouts',
    description:
      'Allows creators to request payouts of their earnings. Disabling will prevent payout requests.',
    icon: DollarSign,
    enabled: true,
    lastChangedBy: null,
    lastChangedAt: null,
    category: 'monetization',
  },
];

type FeatureFlagsApiFlag = {
  key: string;
  enabled: boolean;
  description?: string | null;
  updated_at?: string | null;
};

function titleFromKey(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function categoryFromKey(key: string): FeatureFlag['category'] {
  const k = key.toLowerCase();
  if (k.includes('payout') || k.includes('gift') || k.includes('coin') || k.includes('diamond')) return 'monetization';
  if (k.includes('chat') || k.includes('dm') || k.includes('message') || k.includes('social')) return 'social';
  return 'core';
}

function iconFromKey(key: string): FeatureFlag['icon'] {
  const k = key.toLowerCase();
  if (k.includes('live') || k.includes('stream')) return Radio;
  if (k.includes('gift')) return Gift;
  if (k.includes('chat') || k.includes('message')) return MessageSquare;
  if (k.includes('battle')) return Swords;
  if (k.includes('payout') || k.includes('cashout')) return DollarSign;
  return User;
}

// ============================================================================
// Component
// ============================================================================

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingToggle, setConfirmingToggle] = useState<string | null>(null);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/owner/feature-flags', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Failed to load feature flags (${res.status})`);
      }

      const json = (await res.json()) as { ok: boolean; flags?: FeatureFlagsApiFlag[] };
      if (!json.ok) {
        throw new Error('Failed to load feature flags');
      }

      const apiFlags = Array.isArray(json.flags) ? json.flags : [];
      const mapped: FeatureFlag[] = apiFlags.map((f) => ({
        id: f.key,
        name: titleFromKey(f.key),
        description: typeof f.description === 'string' && f.description.trim() ? f.description : titleFromKey(f.key),
        icon: iconFromKey(f.key),
        enabled: f.enabled === true,
        lastChangedBy: null,
        lastChangedAt: f.updated_at ?? null,
        category: categoryFromKey(f.key),
      }));

      setFlags(mapped);
    } catch (e) {
      console.error('[Owner Feature Flags] load failed:', e);
      setFlags(MOCK_FEATURE_FLAGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFlags();
  }, []);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleToggleFlag = (id: string) => {
    // Show confirmation dialog for disabling critical features
    const flag = flags.find((f) => f.id === id);
    if (flag && flag.enabled && flag.category === 'core') {
      setConfirmingToggle(id);
      return;
    }

    // Toggle immediately for non-critical or enabling
    toggleFlag(id);
  };

  const toggleFlag = (id: string) => {
    const current = flags.find((f) => f.id === id);
    if (!current) return;
    const nextEnabled = !current.enabled;

    setFlags((prev) =>
      prev.map((flag) =>
        flag.id === id
          ? {
              ...flag,
              enabled: nextEnabled,
              lastChangedAt: new Date().toISOString(),
            }
          : flag
      )
    );

    setConfirmingToggle(null);

    void (async () => {
      try {
        const res = await fetch('/api/owner/feature-flags', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: id, enabled: nextEnabled }),
        });

        if (!res.ok) {
          throw new Error(`Failed to update flag (${res.status})`);
        }

        const json = (await res.json()) as { ok: boolean; flag?: FeatureFlagsApiFlag };
        if (!json.ok) {
          throw new Error('Failed to update flag');
        }

        const updatedAt = json.flag?.updated_at ?? new Date().toISOString();
        setFlags((prev) =>
          prev.map((flag) =>
            flag.id === id
              ? {
                  ...flag,
                  enabled: nextEnabled,
                  lastChangedAt: updatedAt,
                }
              : flag
          )
        );
      } catch (e) {
        console.error('[Owner Feature Flags] update failed:', e);
        setFlags((prev) =>
          prev.map((flag) =>
            flag.id === id
              ? {
                  ...flag,
                  enabled: current.enabled,
                }
              : flag
          )
        );
      }
    })();
  };

  const cancelToggle = () => {
    setConfirmingToggle(null);
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'core':
        return 'bg-destructive/10 text-destructive';
      case 'monetization':
        return 'bg-success/10 text-success';
      case 'social':
        return 'bg-info/10 text-info';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'core':
        return 'Critical';
      case 'monetization':
        return 'Revenue';
      case 'social':
        return 'Social';
      default:
        return category;
    }
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <OwnerPanelShell>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Feature Flags / Kill Switches</h1>
          <p className="text-muted-foreground">
            Control platform features and emergency toggles
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-warning/10 border border-warning rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Emergency Kill Switches
            </p>
            <p className="text-xs text-muted-foreground">
              Disabling core features will immediately affect all users. Use with caution and only
              during incidents or maintenance. Changes take effect immediately.
            </p>
          </div>
        </div>

        {/* Feature Flags Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flags.map((flag) => {
              const Icon = flag.icon;
              const isConfirming = confirmingToggle === flag.id;

              return (
                <Card key={flag.id} padding="lg" className="relative">
                  {/* Category Badge */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getCategoryBadgeClass(
                        flag.category
                      )}`}
                    >
                      {getCategoryLabel(flag.category)}
                    </span>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        flag.enabled ? 'bg-success/10' : 'bg-muted'
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${flag.enabled ? 'text-success' : 'text-muted-foreground'}`}
                      />
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">{flag.name}</h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4">{flag.description}</p>

                  {/* Toggle Switch */}
                  {!isConfirming ? (
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span
                        className={`text-sm font-semibold ${
                          flag.enabled ? 'text-success' : 'text-muted-foreground'
                        }`}
                      >
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => handleToggleFlag(flag.id)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                          flag.enabled ? 'bg-success' : 'bg-muted'
                        }`}
                        title={flag.enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                            flag.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-border">
                      <div className="bg-destructive/10 border border-destructive rounded-lg p-3 mb-3">
                        <p className="text-xs font-semibold text-destructive mb-1">
                          Confirm Disable
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This will immediately disable {flag.name} for all users.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleFlag(flag.id)}
                          className="flex-1 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm font-semibold"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={cancelToggle}
                          className="flex-1 px-3 py-2 bg-accent text-foreground rounded-lg hover:bg-accent-hover transition-colors text-sm font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Last Changed Info */}
                  {!isConfirming && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <div>
                          {flag.lastChangedBy ? (
                            <>
                              <p>Changed by {flag.lastChangedBy}</p>
                              <p>{formatTimestamp(flag.lastChangedAt)}</p>
                            </>
                          ) : (
                            <p>No changes recorded</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Section */}
        <Card padding="md" className="mt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">About Feature Flags</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>
                  <strong>Critical:</strong> Core platform features. Disabling requires confirmation.
                </li>
                <li>
                  <strong>Revenue:</strong> Monetization features. May impact earnings.
                </li>
                <li>
                  <strong>Social:</strong> User interaction features. Can be toggled freely.
                </li>
                <li>
                  All changes take effect immediately and are logged for audit purposes.
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </OwnerPanelShell>
  );
}

