'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Video,
  MessageSquare,
  FileText,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Input,
  EmptyState,
  ErrorState,
  Skeleton,
  Badge,
  Button,
} from '@/components/ui';
import type { Report, ReportStatus, ReportType, ReportSeverity } from '@/app/owner/reports/page';

interface ReportsInboxProps {
  reports: Report[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: ReportStatus;
  onStatusFilterChange: (status: ReportStatus) => void;
  typeFilter: ReportType;
  onTypeFilterChange: (type: ReportType) => void;
  severityFilter: ReportSeverity | 'all';
  onSeverityFilterChange: (severity: ReportSeverity | 'all') => void;
  selectedReportId: string | null;
  onReportSelect: (report: Report) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
}

export default function ReportsInbox({
  reports,
  loading,
  error,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  severityFilter,
  onSeverityFilterChange,
  selectedReportId,
  onReportSelect,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
}: ReportsInboxProps) {
  const [showFilters, setShowFilters] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'reviewed':
        return <AlertCircle className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'dismissed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'reviewed':
        return 'info';
      case 'resolved':
        return 'success';
      case 'dismissed':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'stream':
        return <Video className="w-4 h-4" />;
      case 'profile':
        return <FileText className="w-4 h-4" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getSeverityFromReason = (reason: string): ReportSeverity => {
    // Map report reasons to severity (placeholder logic)
    const criticalReasons = ['underage', 'violence', 'threats'];
    const highReasons = ['harassment', 'inappropriate_content', 'hate_speech'];
    const mediumReasons = ['inappropriate', 'spam', 'copyright'];
    
    if (criticalReasons.some(r => reason.includes(r))) return 'critical';
    if (highReasons.some(r => reason.includes(r))) return 'high';
    if (mediumReasons.some(r => reason.includes(r))) return 'medium';
    return 'low';
  };

  const getSeverityBadgeColor = (severity: ReportSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-gray-900';
      case 'low':
        return 'bg-blue-500 text-white';
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <ErrorState
            title="Failed to load reports"
            description={error}
            onRetry={() => window.location.reload()}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by username, reason..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => onStatusFilterChange(e.target.value as ReportStatus)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => onTypeFilterChange(e.target.value as ReportType)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="user">User</option>
                  <option value="stream">Stream</option>
                  <option value="profile">Profile</option>
                  <option value="chat">Chat</option>
                </select>
              </div>

              {/* Severity Filter (Placeholder - not fully implemented in backend) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Severity
                </label>
                <select
                  value={severityFilter}
                  onChange={(e) => onSeverityFilterChange(e.target.value as ReportSeverity | 'all')}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {loading ? 'Loading...' : `${reports.length} report${reports.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Loading State */}
        {loading && (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && reports.length === 0 && (
          <div className="p-12">
            <EmptyState
              icon={<AlertCircle className="w-12 h-12" />}
              title="No reports found"
              description="No reports match your current filters."
            />
          </div>
        )}

        {/* Reports List */}
        {!loading && reports.length > 0 && (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {reports.map((report) => {
              const severity = getSeverityFromReason(report.report_reason);
              const isSelected = selectedReportId === report.id;

              return (
                <button
                  key={report.id}
                  onClick={() => onReportSelect(report)}
                  className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    isSelected ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div className="mt-1 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      {getTypeIcon(report.report_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top Row: User/Stream Info */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 dark:text-white truncate">
                              {report.reported_user?.username || 'Unknown User'}
                            </span>
                            <Badge variant={getStatusColor(report.status) as any} size="sm">
                              {getStatusIcon(report.status)}
                              <span className="ml-1">{report.status}</span>
                            </Badge>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityBadgeColor(severity)}`}>
                              {severity.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <span className="capitalize">{report.report_type}</span>
                            {' • '}
                            <span className="capitalize">{report.report_reason.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(report.created_at)}
                        </div>
                      </div>

                      {/* Bottom Row: Reporter & Details Preview */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          Reported by <span className="font-medium">{report.reporter?.username || 'Anonymous'}</span>
                        </span>
                        {report.report_details && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs">
                              {report.report_details}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && reports.length > 0 && totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

