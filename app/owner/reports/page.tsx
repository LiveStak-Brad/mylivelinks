'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import {
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  EmptyState,
  ErrorState,
  Skeleton,
  Badge,
  Tooltip,
} from '@/components/ui';
import ReportsInbox from '@/components/owner/ReportsInbox';
import ReportDetailPanel from '@/components/owner/ReportDetailPanel';
import { useToast } from '@/components/ui/Toast';

// Types
export interface Report {
  id: string;
  report_type: string;
  report_reason: string;
  report_details: string | null;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  context_details: string | null;
  reporter: {
    username: string;
    display_name: string | null;
  } | null;
  reported_user: {
    id: string;
    username: string;
    display_name: string | null;
  } | null;
}

export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'all' | 'pending' | 'reviewed' | 'dismissed' | 'actioned';
export type ReportType = 'all' | 'user' | 'stream' | 'profile' | 'chat';

export default function ReportsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadRealtimeCount, setUnreadRealtimeCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus>('pending');
  const [typeFilter, setTypeFilter] = useState<ReportType>('all');
  const [severityFilter, setSeverityFilter] = useState<ReportSeverity | 'all'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    loadReports();
  }, [statusFilter, currentPage]);

  useEffect(() => {
    const channel = supabase
      .channel('owner-reports-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'content_reports' },
        async (payload) => {
          const reportId = (payload as any)?.new?.id as string | undefined;
          if (!reportId) return;

          try {
            const { data, error: fetchError } = await supabase
              .from('content_reports')
              .select(
                'id, report_type, report_reason, report_details, status, created_at, reviewed_at, reviewed_by, admin_notes, context_details, reporter:profiles!content_reports_reporter_id_fkey(username, display_name), reported_user:profiles!content_reports_reported_user_id_fkey(id, username, display_name)'
              )
              .eq('id', reportId)
              .limit(1);

            if (fetchError) {
              console.error('[OWNER_REPORTS] realtime_fetch_error', {
                report_id: reportId,
                message: fetchError.message,
                code: (fetchError as any)?.code ?? null,
              });
              return;
            }

            const report = (data ?? [])[0] as any as Report | null;
            if (!report) return;

            setReports((prev) => {
              if (prev.some((r) => r.id === report.id)) return prev;
              return [report, ...prev];
            });

            setUnreadRealtimeCount((c) => c + 1);
            toast({
              title: 'New report received',
              description: `${report.report_type} • ${String(report.report_reason).replace(/_/g, ' ')}`,
              variant: 'warning',
            });
          } catch (e: any) {
            console.error('[OWNER_REPORTS] realtime_handler_exception', {
              report_id: reportId,
              message: e?.message ?? String(e),
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') return;
        if (status === 'CHANNEL_ERROR') {
          console.error('[OWNER_REPORTS] realtime_channel_error');
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [supabase, toast]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const offset = (currentPage - 1) * itemsPerPage;
      const statusParam = statusFilter === 'all' ? '' : statusFilter;

      const response = await fetch(
        `/api/admin/reports?status=${statusParam}&limit=${itemsPerPage}&offset=${offset}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
      // Note: Backend doesn't return total count, so we estimate
      setTotalCount(data.reports?.length === itemsPerPage ? (currentPage + 1) * itemsPerPage : currentPage * itemsPerPage);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setUnreadRealtimeCount(0);
    setRefreshing(false);
  };

  const handleReportSelect = (report: Report) => {
    setSelectedReport(report);
  };

  const handleReportUpdate = async () => {
    // Refresh the list after an action is taken
    await loadReports();
    setSelectedReport(null);
  };

  const handleCloseDetail = () => {
    setSelectedReport(null);
  };

  // Filter reports client-side by search and type
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      !searchQuery ||
      report.reported_user?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reporter?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.report_reason.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || report.report_type === typeFilter;

    // Note: Severity is not stored in DB, so we can't filter by it
    // This is a placeholder for future implementation
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Reports & Moderation
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Review and manage user reports
                </p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {unreadRealtimeCount > 0 && (
              <Badge variant="warning" className="ml-3">
                {unreadRealtimeCount} new
              </Badge>
            )}
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Reports Inbox */}
          <div className={`flex-1 transition-all ${selectedReport ? 'max-w-2xl' : 'max-w-full'}`}>
            <ReportsInbox
              reports={filteredReports}
              loading={loading}
              error={error}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              severityFilter={severityFilter}
              onSeverityFilterChange={setSeverityFilter}
              selectedReportId={selectedReport?.id || null}
              onReportSelect={handleReportSelect}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
            />
          </div>

          {/* Report Detail Panel */}
          {selectedReport && (
            <div className="w-full max-w-xl">
              <ReportDetailPanel
                report={selectedReport}
                onClose={handleCloseDetail}
                onUpdate={handleReportUpdate}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


