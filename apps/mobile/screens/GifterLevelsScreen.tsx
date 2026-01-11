import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { GIFTER_TIERS, formatCoinAmount, getTierCoinRange, getTierLevelRange } from '../lib/gifter-tiers';

const COLORS = {
  bg: '#0B1220',
  card: '#0F1A2E',
  border: 'rgba(255,255,255,0.08)',
  text: '#EAF0FF',
  muted: 'rgba(234,240,255,0.62)',
  muted2: 'rgba(234,240,255,0.45)',
  blue600: '#2563EB',
  cyan600: '#22D3EE',
  purple600: '#7C3AED',
  white: '#FFFFFF',
};

function isDarkHex(hex: string): boolean {
  // Expect #RRGGBB; if not, assume it's fine.
  if (!hex || hex[0] !== '#' || hex.length !== 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance approximation (sRGB-ish, no gamma correction needed for thresholding here)
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.28;
}

function readableTierColor(hex: string): string {
  // Mythic uses a near-black accent; on our dark UI we need a readable fallback.
  return isDarkHex(hex) ? COLORS.text : hex;
}

function tierBadgeStyles(hex: string): { borderColor: string; backgroundColor: string } {
  if (isDarkHex(hex)) {
    return {
      borderColor: 'rgba(255,255,255,0.28)',
      backgroundColor: 'rgba(255,255,255,0.06)',
    };
  }
  return {
    borderColor: `${hex}66`,
    backgroundColor: `${hex}18`,
  };
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: 'center', marginBottom: 12 }}>
      <Text style={styles.h2}>{title}</Text>
      {subtitle ? <Text style={styles.h2Sub}>{subtitle}</Text> : null}
    </View>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.pill}>
      <View style={{ marginRight: 8 }}>{icon}</View>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function Card({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {icon ? <View style={styles.cardIconWrap}>{icon}</View> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{title}</Text>
            {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      </View>
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

function TierBadge({
  emoji,
  color,
  size = 'md',
}: {
  emoji: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = size === 'sm' ? 38 : size === 'lg' ? 62 : 48;
  const font = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  const themed = tierBadgeStyles(color);
  return (
    <View
      style={[
        styles.tierBadge,
        {
          width: dims,
          height: dims,
          borderColor: themed.borderColor,
          backgroundColor: themed.backgroundColor,
        },
      ]}
    >
      <Text style={{ fontSize: font }}>{emoji}</Text>
    </View>
  );
}

function TierRow({
  name,
  emoji,
  color,
  isDiamond,
  levels,
  coinRange,
  progressPct,
}: {
  name: string;
  emoji: string;
  color: string;
  isDiamond: boolean;
  levels: string;
  coinRange: string;
  progressPct: number;
}) {
  return (
    <View style={styles.tierRow}>
      <View style={styles.tierRowTop}>
        <View style={styles.tierRowLeft}>
          <TierBadge emoji={emoji} color={color} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.tierName, isDiamond && { color }]}>{name}</Text>
            <Text style={styles.tierMeta}>{isDiamond ? 'Ultimate tier' : '50 levels per tier'}</Text>
          </View>
        </View>

        <View style={styles.tierRowRight}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.tierRightTop}>{levels}</Text>
            <Text style={styles.tierRightBottom}>{coinRange}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={COLORS.muted} style={{ marginLeft: 10 }} />
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progress (placeholder)</Text>
          <Text style={styles.progressPct}>{Math.round(progressPct)}%</Text>
        </View>
        <ProgressBar pct={progressPct} color={isDiamond ? COLORS.cyan600 : color} />
        <Text style={styles.progressHint}>Requirement: lifetime coins in this tier range</Text>
      </View>
    </View>
  );
}

export default function GifterLevelsScreen() {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownTierKey, setBreakdownTierKey] = useState<string>('starter');

  const tiers = useMemo(() => [...GIFTER_TIERS].sort((a, b) => a.order - b.order), []);
  const breakdownTier = useMemo(() => tiers.find((t) => t.key === breakdownTierKey) ?? tiers[0], [breakdownTierKey, tiers]);

  const placeholderProgressByKey = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tiers) {
      // Placeholder only: a deterministic "progress" that feels varied across tiers.
      map[t.key] = t.isDiamond ? 35 : Math.max(12, Math.min(92, 18 + t.order * 7));
    }
    return map;
  }, [tiers]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <Pill icon={<Feather name="star" size={14} color={COLORS.blue600} />} label="Rewards Program" />
          <Text style={styles.h1}>Gifter Levels</Text>
          <Text style={styles.heroSub}>
            Support your favorite creators and unlock exclusive badges, perks, and recognition as you climb through{' '}
            <Text style={{ fontWeight: '800', color: COLORS.text }}>10 unique tiers</Text>.
          </Text>
        </View>

        {/* How it works */}
        <View style={{ marginBottom: 18 }}>
          <View style={styles.grid3}>
            <View style={styles.smallCard}>
              <View style={styles.smallCardIcon}>
                <Feather name="gift" size={18} color={COLORS.blue600} />
              </View>
              <Text style={styles.smallCardTitle}>Send Gifts</Text>
              <Text style={styles.smallCardText}>Use coins to send gifts to creators during their live streams</Text>
            </View>
            <View style={styles.smallCard}>
              <View style={styles.smallCardIcon}>
                <Feather name="trending-up" size={18} color={COLORS.blue600} />
              </View>
              <Text style={styles.smallCardTitle}>Level Up</Text>
              <Text style={styles.smallCardText}>Every coin you gift counts toward your lifetime total and level</Text>
            </View>
            <View style={styles.smallCard}>
              <View style={styles.smallCardIcon}>
                <Feather name="award" size={18} color={COLORS.blue600} />
              </View>
              <Text style={styles.smallCardTitle}>Get Recognized</Text>
              <Text style={styles.smallCardText}>Unlock badges that show your support level in chat</Text>
            </View>
          </View>
        </View>

        {/* Badge preview */}
        <View style={{ marginBottom: 18 }}>
          <SectionHeader
            title="Exclusive Badges"
            subtitle="Each tier has a unique badge — higher tiers have larger badges (mock)"
          />

          <View style={styles.card}>
            <View style={styles.badgeGrid}>
              {tiers.map((tier) => (
                <View key={tier.key} style={styles.badgeItem}>
                  <TierBadge emoji={tier.icon} color={tier.color} />
                  <Text style={[styles.badgeLabel, { color: readableTierColor(tier.color) }]} numberOfLines={1}>
                    {tier.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Badge size showcase */}
        <View style={{ marginBottom: 18 }}>
          <SectionHeader title="Badges Scale With Your Tier" subtitle="As you climb higher, your badge grows (mock)" />

          <View style={styles.card}>
            <View style={styles.badgeScaleRow}>
              <View style={styles.badgeScaleItem}>
                <TierBadge emoji="🌱" color="#9CA3AF" size="sm" />
                <Text style={styles.badgeScaleName}>Starter</Text>
                <Text style={styles.badgeScaleMeta}>Small</Text>
              </View>
              <View style={styles.badgeScaleItem}>
                <TierBadge emoji="👑" color="#D4AF37" size="md" />
                <Text style={styles.badgeScaleName}>Elite</Text>
                <Text style={styles.badgeScaleMeta}>Medium</Text>
              </View>
              <View style={styles.badgeScaleItem}>
                <TierBadge emoji="💎" color="#22D3EE" size="lg" />
                <Text style={styles.badgeScaleName}>Diamond</Text>
                <Text style={styles.badgeScaleMeta}>Large</Text>
              </View>
            </View>
          </View>
        </View>

        {/* All tiers */}
        <View style={{ marginBottom: 18 }}>
          <SectionHeader title="All Tiers" subtitle="50 levels per tier • Diamond has unlimited levels (mock)" />

          <View style={styles.tierListWrap}>
            {tiers.map((tier) => (
              <TierRow
                key={tier.key}
                name={tier.name}
                emoji={tier.icon}
                color={tier.color}
                isDiamond={tier.isDiamond}
                levels={getTierLevelRange(tier)}
                coinRange={getTierCoinRange(tier)}
                progressPct={placeholderProgressByKey[tier.key] ?? 25}
              />
            ))}
          </View>
        </View>

        {/* Level breakdown */}
        <View style={{ marginBottom: 18 }}>
          <SectionHeader title="Level Breakdown" subtitle="See what each level costs inside a tier (placeholder)" />

          <Pressable
            onPress={() => setShowBreakdown((v) => !v)}
            style={({ pressed }) => [styles.expandRow, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.expandRowText}>View Detailed Level Costs</Text>
            <Feather name={showBreakdown ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.muted} />
          </Pressable>

          {showBreakdown ? (
            <View style={styles.breakdownCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breakdownTabs}>
                {tiers.map((tier) => {
                  const selected = tier.key === breakdownTierKey;
                  const accent = readableTierColor(tier.color);
                  return (
                    <Pressable
                      key={tier.key}
                      onPress={() => setBreakdownTierKey(tier.key)}
                      style={({ pressed }) => [
                        styles.breakdownTab,
                        selected && styles.breakdownTabSelected,
                        pressed && { opacity: 0.92 },
                        selected && { borderBottomColor: accent },
                      ]}
                    >
                      <Text style={{ fontSize: 14, marginRight: 8 }}>{tier.icon}</Text>
                      <Text style={[styles.breakdownTabText, selected && { color: accent }]}>{tier.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.breakdownSummary}>
                <TierBadge emoji={breakdownTier.icon} color={breakdownTier.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.breakdownTitle, { color: readableTierColor(breakdownTier.color) }]}>
                    {breakdownTier.name} Tier
                  </Text>
                  <Text style={styles.breakdownSub}>
                    {breakdownTier.isDiamond
                      ? `${formatCoinAmount(breakdownTier.minLifetimeCoins)}+ coins • Unlimited levels`
                      : `${getTierCoinRange(breakdownTier)} coins • 50 levels`}
                  </Text>
                </View>
              </View>

              <View style={styles.breakdownTable}>
                <View style={styles.breakdownTableHeader}>
                  <Text style={[styles.breakdownTh, { flex: 1 }]}>Level</Text>
                  <Text style={[styles.breakdownTh, { width: 130, textAlign: 'right' }]}>Coins Needed</Text>
                  <Text style={[styles.breakdownTh, { width: 120, textAlign: 'right' }]}>Cost</Text>
                </View>

                {Array.from({ length: 8 }).map((_, idx) => {
                  const lv = idx + 1;
                  const base = breakdownTier.minLifetimeCoins + idx * 12_345;
                  const next = base + 12_345 + idx * 1_111;
                  const cost = next - base;
                  return (
                    <View key={lv} style={styles.breakdownTr}>
                      <Text style={[styles.breakdownTd, { flex: 1 }]}>{`Lv ${lv}`}</Text>
                      <Text style={[styles.breakdownTdMuted, { width: 130, textAlign: 'right' }]}>
                        {formatCoinAmount(base)} → {formatCoinAmount(next)}
                      </Text>
                      <Text style={[styles.breakdownTdStrong, { width: 120, textAlign: 'right', color: COLORS.blue600 }]}>
                        {formatCoinAmount(cost)}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {breakdownTier.isDiamond ? (
                <View style={styles.diamondNote}>
                  <Text style={styles.diamondNoteText}>
                    Diamond has unlimited levels. Showing a short preview only (placeholder).
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Diamond highlight */}
        <View style={styles.diamondHighlight}>
          <View style={styles.diamondHighlightRow}>
            <View style={styles.diamondBigIcon}>
              <Text style={{ fontSize: 34 }}>💎</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.diamondTitle}>Reach Diamond Status</Text>
              <Text style={styles.diamondSub}>
                The ultimate recognition for our most generous supporters. Diamond members have unlimited levels and
                exclusive perks. Unlock at <Text style={{ fontWeight: '800' }}>60M</Text> lifetime coins gifted.
              </Text>
            </View>
          </View>
        </View>

        {/* CTA (UI only) */}
        <View style={{ paddingBottom: 18 }}>
          <SectionHeader title="Ready to Start?" subtitle="Get coins and start supporting creators (UI only)" />
          <View style={styles.ctaRow}>
            <View style={[styles.ctaBtn, styles.ctaPrimary, styles.ctaDisabled]}>
              <Feather name="credit-card" size={16} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={[styles.ctaBtnText, { color: COLORS.white }]}>Get Coins</Text>
            </View>
            <View style={[styles.ctaBtn, styles.ctaSecondary, styles.ctaDisabled]}>
              <Feather name="play" size={16} color={COLORS.text} style={{ marginRight: 8 }} />
              <Text style={[styles.ctaBtnText, { color: COLORS.text }]}>Browse Live Streams</Text>
            </View>
          </View>
          <Text style={styles.ctaHint}>Buttons are disabled in this mock (no purchase/upgrade/nav logic).</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { paddingHorizontal: 16, paddingTop: 10 },

  h1: { fontSize: 34, fontWeight: '900', color: COLORS.text, marginTop: 10 },
  heroSub: { marginTop: 8, color: COLORS.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 340 },

  h2: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  h2Sub: { marginTop: 6, fontSize: 13, color: COLORS.muted, textAlign: 'center' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(37,99,235,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
  },
  pillText: { color: COLORS.text, fontSize: 12, fontWeight: '800' },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '900' },
  cardSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },

  grid3: { flexDirection: 'row', gap: 10 },
  smallCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  smallCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(37,99,235,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  smallCardTitle: { color: COLORS.text, fontWeight: '900', fontSize: 14, marginBottom: 6 },
  smallCardText: { color: COLORS.muted, fontSize: 12, lineHeight: 16 },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  badgeItem: { width: 86, alignItems: 'center' },
  badgeLabel: { marginTop: 8, fontSize: 11, fontWeight: '800' },

  badgeScaleRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  badgeScaleItem: { alignItems: 'center' },
  badgeScaleName: { marginTop: 10, color: COLORS.text, fontSize: 12, fontWeight: '800' },
  badgeScaleMeta: { marginTop: 2, color: COLORS.muted2, fontSize: 10, fontWeight: '800' },

  tierBadge: {
    borderWidth: 2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tierListWrap: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tierRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tierRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tierRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10, gap: 10 },
  tierName: { color: COLORS.text, fontSize: 15, fontWeight: '900' },
  tierMeta: { color: COLORS.muted2, fontSize: 11, marginTop: 2, fontWeight: '700' },
  tierRowRight: { flexDirection: 'row', alignItems: 'center' },
  tierRightTop: { color: COLORS.muted, fontSize: 12, fontWeight: '900' },
  tierRightBottom: { color: COLORS.muted2, fontSize: 11, marginTop: 2, fontWeight: '700' },

  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '800' },
  progressPct: { color: COLORS.text, fontSize: 11, fontWeight: '900' },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressFill: { height: '100%', borderRadius: 999 },
  progressHint: { marginTop: 6, color: COLORS.muted2, fontSize: 10, fontWeight: '700' },

  expandRow: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandRowText: { color: COLORS.text, fontSize: 14, fontWeight: '900' },

  breakdownCard: {
    marginTop: 10,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  breakdownTabs: { paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  breakdownTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  breakdownTabSelected: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  breakdownTabText: { color: COLORS.text, fontWeight: '900', fontSize: 12 },

  breakdownSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  breakdownTitle: { fontSize: 16, fontWeight: '900' },
  breakdownSub: { marginTop: 4, color: COLORS.muted, fontSize: 12, fontWeight: '700' },

  breakdownTable: { paddingHorizontal: 14, paddingBottom: 12 },
  breakdownTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breakdownTh: { color: COLORS.muted, fontSize: 11, fontWeight: '900' },
  breakdownTr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  breakdownTd: { color: COLORS.text, fontSize: 12, fontWeight: '900' },
  breakdownTdMuted: { color: COLORS.muted, fontSize: 11, fontWeight: '800' },
  breakdownTdStrong: { fontSize: 12, fontWeight: '900' },

  diamondNote: { padding: 12, backgroundColor: 'rgba(34,211,238,0.12)', borderTopWidth: 1, borderTopColor: 'rgba(34,211,238,0.25)' },
  diamondNoteText: { color: 'rgba(34,211,238,0.92)', fontSize: 12, fontWeight: '800', textAlign: 'center' },

  diamondHighlight: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.25)',
    backgroundColor: 'rgba(34,211,238,0.10)',
    padding: 14,
    marginBottom: 18,
  },
  diamondHighlightRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  diamondBigIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(34,211,238,0.35)',
  },
  diamondTitle: { color: COLORS.cyan600, fontSize: 18, fontWeight: '900', marginBottom: 6 },
  diamondSub: { color: COLORS.muted, fontSize: 12, lineHeight: 17, fontWeight: '700' },

  ctaRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 160,
  },
  ctaPrimary: { backgroundColor: COLORS.blue600, borderColor: 'rgba(37,99,235,0.35)' },
  ctaSecondary: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: COLORS.border },
  ctaDisabled: { opacity: 0.55 },
  ctaBtnText: { fontSize: 13, fontWeight: '900' },
  ctaHint: { marginTop: 10, textAlign: 'center', color: COLORS.muted2, fontSize: 11, fontWeight: '700' },
});
