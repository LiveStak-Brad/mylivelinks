'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  SupportBadgeCounts,
  SupportMessage,
  SupportTicketDetail,
  SupportTicketFilters,
  SupportTicketListResponse,
  SupportTicketStatus,
  SupportTicketSummary,
} from '@/types/support';

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  details?: unknown;
};

const DEFAULT_FILTERS: SupportTicketFilters = {
  status: 'all',
  severity: 'all',
  category: null,
  search: null,
};

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
    cache: 'no-store',
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.ok === false) {
    const error = payload.error ?? `Request failed with ${response.status}`;
    throw new Error(error);
  }

  if (!payload.data) {
    throw new Error('No data returned');
  }

  return payload.data;
}

export function useSupportBadgeCounts() {
  const [counts, setCounts] = useState<SupportBadgeCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson<SupportTicketListResponse>('/api/owner/support/tickets?summaryOnly=true');
      setCounts(data.badges);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load support counts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { counts, loading, error, refresh };
}

export function useOwnerSupportTickets(initialFilters?: SupportTicketFilters) {
  const [filters, setFilters] = useState<SupportTicketFilters>({ ...DEFAULT_FILTERS, ...(initialFilters ?? {}) });
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [badges, setBadges] = useState<SupportBadgeCounts>({
    open: 0,
    escalated: 0,
    highSeverity: 0,
  });
  const [pagination, setPagination] = useState({ total: 0, limit: 25, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [messageSending, setMessageSending] = useState(false);

  const buildQuery = useCallback(
    (overrides?: Partial<{ limit: number; offset: number }>) => {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.severity && filters.severity !== 'all') params.set('severity', filters.severity);
      if (filters.category) params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);
      params.set('limit', String(overrides?.limit ?? pagination.limit));
      params.set('offset', String(overrides?.offset ?? pagination.offset));
      return `/api/owner/support/tickets?${params.toString()}`;
    },
    [filters, pagination.limit, pagination.offset]
  );

  const fetchTickets = useCallback(
    async (overrides?: Partial<{ limit: number; offset: number }>) => {
      setLoading(true);
      setError(null);
      try {
        const data = await requestJson<SupportTicketListResponse>(buildQuery(overrides));
        setTickets(data.tickets);
        setBadges(data.badges);
        setPagination({
          total: data.total,
          limit: data.limit,
          offset: data.offset,
        });
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load support tickets');
      } finally {
        setLoading(false);
      }
    },
    [buildQuery]
  );

  const refresh = useCallback(() => {
    return fetchTickets();
  }, [fetchTickets]);

  const updateFilters = useCallback((partial: Partial<SupportTicketFilters>) => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const loadTicket = useCallback(
    async (ticketId: string) => {
      setSelectedTicketId(ticketId);
      setDetailLoading(true);
      try {
        const detail = await requestJson<SupportTicketDetail>(`/api/owner/support/tickets/${ticketId}`);
        setSelectedTicket(detail);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load ticket detail');
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  const updateStatus = useCallback(
    async (ticketId: string, status: SupportTicketStatus, assignToOwner?: boolean) => {
      setStatusUpdating(true);
      try {
        await requestJson<SupportTicketDetail>(`/api/owner/support/tickets/${ticketId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status, assignToOwner }),
        });
        await Promise.all([loadTicket(ticketId), refresh()]);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to update status');
      } finally {
        setStatusUpdating(false);
      }
    },
    [loadTicket, refresh]
  );

  const addMessage = useCallback(
    async (ticketId: string, payload: { message: string; kind: 'reply' | 'internal_note' }) => {
      setMessageSending(true);
      try {
        const message = await requestJson<SupportMessage>(`/api/owner/support/tickets/${ticketId}/messages`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSelectedTicket((prev) => {
          if (!prev) return prev;
          if (prev.id !== ticketId) return prev;
          return {
            ...prev,
            messages: [...prev.messages, message],
          };
        });
      } catch (err: any) {
        setError(err?.message ?? 'Failed to add message');
      } finally {
        setMessageSending(false);
      }
    },
    []
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
    void fetchTickets({ offset: 0 });
  }, [filters, fetchTickets]);

  useEffect(() => {
    if (!selectedTicketId && tickets.length > 0) {
      void loadTicket(tickets[0].id);
    }
  }, [tickets, selectedTicketId, loadTicket]);

  const availableStatuses = useMemo<SupportTicketStatus[]>(() => ['open', 'in_progress', 'resolved', 'escalated'], []);

  return {
    tickets,
    badges,
    filters,
    updateFilters,
    pagination,
    loading,
    error,
    refresh,
    availableStatuses,
    selectedTicketId,
    selectedTicket,
    detailLoading,
    selectTicket: loadTicket,
    statusUpdating,
    messageSending,
    updateStatus,
    addMessage,
    setPage: (offset: number) => {
      setPagination((prev) => ({ ...prev, offset }));
      void fetchTickets({ offset });
    },
    setLimit: (limit: number) => {
      setPagination((prev) => ({ ...prev, limit }));
      void fetchTickets({ limit, offset: 0 });
    },
  };
}
