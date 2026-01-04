import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type SupportAISummary,
  type SupportBadgeCounts,
  type SupportMessage,
  type SupportTicketDetail,
  type SupportTicketFilters,
  type SupportTicketListResponse,
  type SupportTicketSeverity,
  type SupportTicketStatus,
  type SupportTicketSummary,
} from '@/types/support';
import { getOwnerProfileIds } from '@/lib/rbac';

type DbClient = SupabaseClient<any, 'public', any>;

const TICKET_SELECT = `
  id,
  reporter_profile_id,
  assigned_to,
  message,
  context,
  ai_summary,
  ai_error,
  ai_model,
  ai_duration_ms,
  status,
  source,
  created_at,
  updated_at,
  reporter:profiles!support_tickets_reporter_profile_id_fkey(id, username, display_name, avatar_url),
  assignee:profiles!support_tickets_assigned_to_fkey(id, username, display_name, avatar_url)
`;

const MESSAGE_SELECT = `
  id,
  ticket_id,
  sender_profile_id,
  role,
  message,
  metadata,
  created_at,
  sender:profiles!support_messages_sender_profile_id_fkey(id, username, display_name, avatar_url)
`;

function mapProfile(row: any) {
  if (!row) return null;
  return {
    id: String(row.id ?? ''),
    username: row.username ?? null,
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
  };
}

function mapAiSummary(value: any): SupportAISummary | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const summary = typeof value.summary === 'string' ? value.summary : null;
  const category = typeof value.category === 'string' ? value.category : null;
  const severity = typeof value.severity === 'string' ? (value.severity.toLowerCase() as SupportTicketSeverity) : null;
  const followups = Array.isArray(value.followups) ? value.followups.filter((item) => typeof item === 'string') : [];

  return {
    summary,
    category,
    severity: severity ?? null,
    followups,
  };
}

function mapTicketRow(row: any): SupportTicketSummary {
  return {
    id: String(row.id ?? ''),
    reporterProfileId: String(row.reporter_profile_id ?? ''),
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    status: (String(row.status ?? 'open').toLowerCase() as SupportTicketStatus) ?? 'open',
    source: row.source ?? 'support',
    message: row.message ?? '',
    context: row.context ?? null,
    aiSummary: mapAiSummary(row.ai_summary),
    aiModel: row.ai_model ?? null,
    aiDurationMs: typeof row.ai_duration_ms === 'number' ? row.ai_duration_ms : null,
    aiError: row.ai_error ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    reporter: mapProfile(row.reporter),
    assignee: mapProfile(row.assignee),
  };
}

function mapMessageRow(row: any): SupportMessage {
  return {
    id: String(row.id ?? ''),
    ticketId: String(row.ticket_id ?? ''),
    senderProfileId: row.sender_profile_id ? String(row.sender_profile_id) : null,
    role: (row.role ?? 'staff') as SupportMessage['role'],
    message: row.message ?? '',
    metadata: row.metadata ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    sender: mapProfile(row.sender),
  };
}

function applyTicketFilters(query: any, filters: SupportTicketFilters) {
  const status = filters.status && filters.status !== 'all' ? filters.status : null;
  const severity = filters.severity && filters.severity !== 'all' ? filters.severity : null;
  const category = filters.category?.trim();
  const search = filters.search?.trim();

  if (status) {
    query.eq('status', status);
  }

  if (severity) {
    query.filter('ai_summary->>severity', 'eq', severity);
  }

  if (category) {
    query.filter('ai_summary->>category', 'ilike', `%${category.replace(/%/g, '').replace(/_/g, '')}%`);
  }

  if (search) {
    const safeSearch = search.replace(/[,%_]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safeSearch.length > 0) {
      query.or(
        `message.ilike.%${safeSearch}%,ai_summary->>summary.ilike.%${safeSearch}%,ai_summary->>category.ilike.%${safeSearch}%`
      );
    }
  }
}

async function selectTickets(params: {
  supabase: DbClient;
  filters: SupportTicketFilters;
  limit: number;
  offset: number;
}): Promise<SupportTicketListResponse> {
  const { supabase, filters, limit, offset } = params;

  const query = supabase.from('support_tickets').select(TICKET_SELECT, { count: 'exact' }).order('created_at', {
    ascending: false,
  });

  applyTicketFilters(query, filters);

  if (limit > 0) {
    query.range(offset, offset + limit - 1);
  } else {
    query.limit(0);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  const tickets = Array.isArray(data) ? data.map(mapTicketRow) : [];

  return {
    tickets,
    badges: { open: 0, escalated: 0, highSeverity: 0 },
    total: typeof count === 'number' ? count : tickets.length,
    limit,
    offset,
  };
}

async function countFromQuery(promise: Promise<{ count: number | null; error: any }>): Promise<number> {
  try {
    const { count, error } = await promise;
    if (error) {
      console.warn('[owner-support] count query failed', error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.warn('[owner-support] count query exception', err);
    return 0;
  }
}

export async function fetchSupportBadges(supabase: DbClient): Promise<SupportBadgeCounts> {
  const ownerIds = getOwnerProfileIds();
  const primaryOwnerId = ownerIds[0] ?? null;

  const openCountPromise = supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');

  const escalatedPromise = primaryOwnerId
    ? supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', primaryOwnerId)
        .in('status', ['open', 'in_progress'])
    : Promise.resolve({ count: 0, error: null });

  const highSeverityPromise = supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .in('status', ['open', 'in_progress'])
    .or('ai_summary->>severity.eq.high,ai_summary->>severity.eq.critical');

  const [open, escalated, highSeverity] = await Promise.all([
    countFromQuery(openCountPromise),
    countFromQuery(escalatedPromise as any),
    countFromQuery(highSeverityPromise),
  ]);

  return {
    open,
    escalated,
    highSeverity,
  };
}

export async function listSupportTickets(params: {
  supabase: DbClient;
  filters: SupportTicketFilters;
  limit?: number;
  offset?: number;
}): Promise<SupportTicketListResponse> {
  const result = await selectTickets({
    supabase: params.supabase,
    filters: params.filters,
    limit: Math.max(0, params.limit ?? 25),
    offset: Math.max(0, params.offset ?? 0),
  });

  const badges = await fetchSupportBadges(params.supabase);

  return {
    ...result,
    badges,
  };
}

export async function getSupportTicketDetail(params: {
  supabase: DbClient;
  ticketId: string;
}): Promise<SupportTicketDetail | null> {
  const { data, error } = await params.supabase
    .from('support_tickets')
    .select(TICKET_SELECT)
    .eq('id', params.ticketId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  const ticket = mapTicketRow(data);

  const { data: messagesData, error: messageError } = await params.supabase
    .from('support_messages')
    .select(MESSAGE_SELECT)
    .eq('ticket_id', params.ticketId)
    .order('created_at', { ascending: true });

  if (messageError) {
    throw messageError;
  }

  const messages = Array.isArray(messagesData) ? messagesData.map(mapMessageRow) : [];

  return {
    ...ticket,
    messages,
  };
}

export async function updateSupportTicket(params: {
  supabase: DbClient;
  ticketId: string;
  status?: SupportTicketStatus;
  assignToOwner?: boolean;
}): Promise<SupportTicketSummary> {
  const updates: Record<string, any> = {};

  if (params.status) {
    updates.status = params.status;
  }

  if (typeof params.assignToOwner === 'boolean') {
    const ownerId = getOwnerProfileIds()[0] ?? null;
    updates.assigned_to = params.assignToOwner && ownerId ? ownerId : null;
  }

  if (Object.keys(updates).length === 0) {
    const detail = await getSupportTicketDetail({ supabase: params.supabase, ticketId: params.ticketId });
    if (!detail) {
      throw new Error('Ticket not found');
    }
    return detail;
  }

  const { data, error } = await params.supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', params.ticketId)
    .select(TICKET_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return mapTicketRow(data);
}

export async function addSupportMessage(params: {
  supabase: DbClient;
  ticketId: string;
  senderProfileId: string;
  message: string;
  kind: 'reply' | 'internal_note';
}): Promise<SupportMessage> {
  const metadata = {
    kind: params.kind,
    is_internal: params.kind === 'internal_note',
    added_by: 'owner',
    added_at: new Date().toISOString(),
  };

  const { data, error } = await params.supabase
    .from('support_messages')
    .insert({
      ticket_id: params.ticketId,
      sender_profile_id: params.senderProfileId,
      role: 'staff',
      message: params.message,
      metadata,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return mapMessageRow(data);
}
