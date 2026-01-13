import { z } from "zod";

import type {
  AuditLogRow,
  DashboardStats,
  FeatureFlag,
  LiveStreamRow,
  OwnerHealthResponse,
  OwnerLiveResponse,
  OwnerPanelDataSource,
  OwnerReportsResponse,
  OwnerSummaryResponse,
  ReferralSnapshot,
  ReportRow,
  RevenueSummary,
  SystemHealth,
  TimeSeriesPoint,
  TopCreatorToday,
} from "./ownerPanel.types";

const UuidSchema = z.string().uuid();
const DateTimeSchema = z.string().datetime();

const PageMetaSchema = z.object({
  limit: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  total: z.number().int().nonnegative().nullable(),
  has_more: z.boolean().nullable(),
  next_offset: z.number().int().nonnegative().nullable(),
});

const PaginatedListSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    page: PageMetaSchema,
  });

export const DashboardStatsSchema = z
  .object({
    generated_at: DateTimeSchema,
    users_total: z.number().int().nonnegative(),
    users_new_24h: z.number().int().nonnegative(),
    users_active_24h: z.number().int().nonnegative(),
    users_active_7d: z.number().int().nonnegative(),
    profiles_total: z.number().int().nonnegative(),
    streams_live: z.number().int().nonnegative(),
    gifts_today_count: z.number().int().nonnegative(),
    gifts_today_coins: z.number().int().nonnegative(),
    reports_pending: z.number().int().nonnegative(),
    applications_pending: z.number().int().nonnegative(),
    revenue_today_usd_cents: z.number().int().nonnegative(),
    revenue_30d_usd_cents: z.number().int().nonnegative(),
  }) satisfies z.ZodType<DashboardStats>;

export const LiveStreamRowSchema = z
  .object({
    stream_id: z.string().min(1),
    room_id: z.string().min(1).nullable(),
    room_slug: z.string().min(1).nullable(),
    title: z.string().min(1).nullable(),
    status: z.enum(["live", "ended", "starting", "scheduled"]),
    started_at: DateTimeSchema,
    ended_at: DateTimeSchema.nullable(),
    host_profile_id: UuidSchema,
    host_username: z.string().min(1),
    host_display_name: z.string().min(1).nullable(),
    host_avatar_url: z.string().nullable(),
    viewer_count: z.number().int().nonnegative(),
    peak_viewer_count: z.number().int().nonnegative().nullable(),
    is_recording: z.boolean(),
  }) satisfies z.ZodType<LiveStreamRow>;

export const ReportRowSchema = z
  .object({
    id: UuidSchema,
    report_type: z.enum(["user", "post", "comment", "message", "room", "other"]),
    report_reason: z.string().min(1),
    report_details: z.string().nullable(),
    status: z.enum(["pending", "reviewed", "dismissed", "actioned"]),
    created_at: DateTimeSchema,
    reviewed_at: DateTimeSchema.nullable(),
    reviewed_by: UuidSchema.nullable(),
    admin_notes: z.string().nullable(),
    reporter: z
      .object({
        username: z.string().min(1).nullable(),
        display_name: z.string().min(1).nullable(),
        avatar_url: z.string().url().nullable(),
      })
      .nullable(),
    reported_user: z
      .object({
        id: UuidSchema,
        username: z.string().min(1).nullable(),
        display_name: z.string().min(1).nullable(),
        avatar_url: z.string().url().nullable(),
      })
      .nullable(),
  }) satisfies z.ZodType<ReportRow>;

export const RevenueSummarySchema = z
  .object({
    window_start_at: DateTimeSchema,
    window_end_at: DateTimeSchema,
    currency: z.literal("USD"),
    gross_usd_cents: z.number().int().nonnegative(),
    net_usd_cents: z.number().int().nonnegative(),
    platform_fee_usd_cents: z.number().int().nonnegative(),
    creator_payout_usd_cents: z.number().int().nonnegative(),
    coin_purchases_count: z.number().int().nonnegative(),
    cashouts_count: z.number().int().nonnegative(),
    diamond_conversions_count: z.number().int().nonnegative(),
  }) satisfies z.ZodType<RevenueSummary>;

export const FeatureFlagSchema = (z
  .object({
    key: z.string().min(1),
    description: z.string().nullable(),
    scope: z.enum(["global", "web", "mobile", "server"]),
    enabled: z.boolean(),
    value_json: z.unknown().nullable().optional(),
    updated_at: DateTimeSchema,
  })
  .transform((v) => ({
    ...v,
    value_json: v.value_json ?? null,
  })) as unknown) as z.ZodType<FeatureFlag>;

export const SystemHealthSchema = z
  .object({
    status: z.enum(["ok", "degraded", "down"]),
    checked_at: DateTimeSchema,
    services: z.object({
      database: z.object({
        status: z.enum(["ok", "degraded", "down"]),
        checked_at: DateTimeSchema,
        latency_ms: z.number().int().nonnegative().nullable(),
        error: z.string().nullable(),
      }),
      storage: z.object({
        status: z.enum(["ok", "degraded", "down"]),
        checked_at: DateTimeSchema,
        latency_ms: z.number().int().nonnegative().nullable(),
        error: z.string().nullable(),
      }),
      livekit: z.object({
        status: z.enum(["ok", "degraded", "down"]),
        checked_at: DateTimeSchema,
        latency_ms: z.number().int().nonnegative().nullable(),
        error: z.string().nullable(),
        token_success_rate: z.number().nonnegative().nullable(),
        avg_join_time_ms: z.number().nonnegative().nullable(),
        live_count: z.number().int().nonnegative().nullable(),
      }),
      stripe: z.object({
        status: z.enum(["ok", "degraded", "down"]),
        checked_at: DateTimeSchema,
        latency_ms: z.number().int().nonnegative().nullable(),
        error: z.string().nullable(),
      }),
    }),
  }) satisfies z.ZodType<SystemHealth>;

export const AuditLogRowSchema = z
  .object({
    id: UuidSchema,
    created_at: DateTimeSchema,
    actor_profile_id: UuidSchema.nullable(),
    actor_username: z.string().min(1).nullable(),
    action: z.string().min(1),
    resource_type: z.string().min(1),
    resource_id: z.string().min(1).nullable(),
    ip_address: z.string().min(1).nullable(),
    user_agent: z.string().min(1).nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
  }) satisfies z.ZodType<AuditLogRow>;

export const TimeSeriesPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  value: z.number().int().nonnegative(),
}) satisfies z.ZodType<TimeSeriesPoint>;

export const TopCreatorTodaySchema = z.object({
  profile_id: z.string().uuid(),
  username: z.string().min(1),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  gifts_received: z.number().int().nonnegative(),
  coins_received: z.number().int().nonnegative(),
}) satisfies z.ZodType<TopCreatorToday>;

export const ReferralSnapshotSchema = z.object({
  clicks_today: z.number().int().nonnegative(),
  signups_today: z.number().int().nonnegative(),
  top_referrer: z.object({
    username: z.string().min(1),
    signups: z.number().int().nonnegative(),
  }).nullable(),
}) satisfies z.ZodType<ReferralSnapshot>;

const OwnerPanelErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  http_status: z.number().int().nonnegative().nullable(),
  details: z.unknown().nullable().optional(),
});

const OwnerPanelDataSourceSchema = z.enum(["supabase", "empty_not_wired"]) satisfies z.ZodType<OwnerPanelDataSource>;

const OwnerSummaryDataSchema = z.object({
  generated_at: DateTimeSchema,
  stats: DashboardStatsSchema,
  revenue_summary: RevenueSummarySchema,
  system_health: SystemHealthSchema,
  feature_flags: PaginatedListSchema(FeatureFlagSchema),
  live_streams: PaginatedListSchema(LiveStreamRowSchema),
  reports: PaginatedListSchema(ReportRowSchema),
  audit_logs: PaginatedListSchema(AuditLogRowSchema),
  // Analytics time series (7 days)
  gifts_over_time: z.array(TimeSeriesPointSchema),
  users_over_time: z.array(TimeSeriesPointSchema),
  streams_over_time: z.array(TimeSeriesPointSchema),
  // Snapshots
  top_creators_today: z.array(TopCreatorTodaySchema),
  referrals_today: ReferralSnapshotSchema,
});

export const OwnerSummaryResponseSchema = (z.union([
  z.object({ ok: z.literal(true), data: OwnerSummaryDataSchema, dataSource: OwnerPanelDataSourceSchema }),
  z.object({ ok: z.literal(false), error: OwnerPanelErrorSchema }),
]) as unknown) as z.ZodType<OwnerSummaryResponse>;

const OwnerLiveDataSchema = z.object({
  generated_at: DateTimeSchema,
  live_streams: PaginatedListSchema(LiveStreamRowSchema),
});

export const OwnerLiveResponseSchema = (z.union([
  z.object({ ok: z.literal(true), data: OwnerLiveDataSchema, dataSource: OwnerPanelDataSourceSchema }),
  z.object({ ok: z.literal(false), error: OwnerPanelErrorSchema }),
]) as unknown) as z.ZodType<OwnerLiveResponse>;

const OwnerReportsDataSchema = z.object({
  generated_at: DateTimeSchema,
  reports: PaginatedListSchema(ReportRowSchema),
});

export const OwnerReportsResponseSchema = (z.union([
  z.object({ ok: z.literal(true), data: OwnerReportsDataSchema, dataSource: OwnerPanelDataSourceSchema }),
  z.object({ ok: z.literal(false), error: OwnerPanelErrorSchema }),
]) as unknown) as z.ZodType<OwnerReportsResponse>;

const OwnerHealthDataSchema = z.object({
  generated_at: DateTimeSchema,
  system_health: SystemHealthSchema,
});

export const OwnerHealthResponseSchema = (z.union([
  z.object({ ok: z.literal(true), data: OwnerHealthDataSchema, dataSource: OwnerPanelDataSourceSchema }),
  z.object({ ok: z.literal(false), error: OwnerPanelErrorSchema }),
]) as unknown) as z.ZodType<OwnerHealthResponse>;
