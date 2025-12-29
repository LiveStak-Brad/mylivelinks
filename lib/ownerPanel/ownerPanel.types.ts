export type DashboardStats = {
  generated_at: string;
  users_total: number;
  users_new_24h: number;
  users_active_24h: number;
  users_active_7d: number;
  profiles_total: number;
  streams_live: number;
  reports_pending: number;
  applications_pending: number;
  revenue_today_usd_cents: number;
  revenue_30d_usd_cents: number;
};

export type LiveStreamRow = {
  stream_id: string;
  room_id: string;
  room_slug: string | null;
  title: string | null;
  status: "live" | "ended" | "starting" | "scheduled";
  started_at: string;
  ended_at: string | null;
  host_profile_id: string;
  host_username: string;
  host_display_name: string | null;
  host_avatar_url: string | null;
  viewer_count: number;
  peak_viewer_count: number | null;
  is_recording: boolean;
};

export type ReportRow = {
  id: string;
  report_type: "user" | "post" | "comment" | "message" | "room" | "other";
  report_reason: string;
  report_details: string | null;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  reporter: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  reported_user: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type RevenueSummary = {
  window_start_at: string;
  window_end_at: string;
  currency: "USD";
  gross_usd_cents: number;
  net_usd_cents: number;
  platform_fee_usd_cents: number;
  creator_payout_usd_cents: number;
  coin_purchases_count: number;
  cashouts_count: number;
  diamond_conversions_count: number;
};

export type FeatureFlag = {
  key: string;
  description: string | null;
  scope: "global" | "web" | "mobile" | "server";
  enabled: boolean;
  value_json: unknown | null;
  updated_at: string;
};

export type SystemHealth = {
  status: "ok" | "degraded" | "down";
  checked_at: string;
  services: {
    database: {
      status: "ok" | "degraded" | "down";
      checked_at: string;
      latency_ms: number | null;
      error: string | null;
    };
    storage: {
      status: "ok" | "degraded" | "down";
      checked_at: string;
      latency_ms: number | null;
      error: string | null;
    };
    livekit: {
      status: "ok" | "degraded" | "down";
      checked_at: string;
      latency_ms: number | null;
      error: string | null;
    };
    stripe: {
      status: "ok" | "degraded" | "down";
      checked_at: string;
      latency_ms: number | null;
      error: string | null;
    };
  };
};

export type AuditLogRow = {
  id: string;
  created_at: string;
  actor_profile_id: string | null;
  actor_username: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
};

type PageMeta = {
  limit: number;
  offset: number;
  total: number | null;
  has_more: boolean | null;
  next_offset: number | null;
};

type PaginatedList<T> = {
  items: T[];
  page: PageMeta;
};

type OwnerPanelError = {
  code: string;
  message: string;
  http_status: number | null;
  details: unknown | null;
};

type OwnerSummaryData = {
  generated_at: string;
  stats: DashboardStats;
  revenue_summary: RevenueSummary;
  system_health: SystemHealth;
  feature_flags: PaginatedList<FeatureFlag>;
  live_streams: PaginatedList<LiveStreamRow>;
  reports: PaginatedList<ReportRow>;
  audit_logs: PaginatedList<AuditLogRow>;
};

export type OwnerSummaryResponse =
  | { ok: true; data: OwnerSummaryData }
  | { ok: false; error: OwnerPanelError };
