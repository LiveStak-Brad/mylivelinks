/**
 * RecentReportsTable Component
 * Displays recent moderation reports with review actions
 */

import { AlertTriangle, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, EmptyState } from '@/components/ui';
import type { ReportInfo } from '@/hooks';

export interface RecentReportsTableProps {
  reports: ReportInfo[];
  loading?: boolean;
  onReview?: (reportId: string) => void;
}

export function RecentReportsTable({
  reports,
  loading = false,
  onReview,
}: RecentReportsTableProps) {
  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getSeverityVariant = (
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): 'info' | 'warning' | 'destructive' => {
    switch (severity) {
      case 'low':
        return 'info';
      case 'medium':
        return 'warning';
      case 'high':
      case 'critical':
        return 'destructive';
    }
  };

  const formatReportType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getReportTarget = (report: ReportInfo) => {
    if (report.reported_user_username) {
      return `User: ${report.reported_user_username}`;
    }
    if (report.reported_stream_id) {
      return `Stream #${report.reported_stream_id}`;
    }
    return 'Unknown';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          Recent Reports ({reports.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No reports"
            description="No moderation reports to review."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Target
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Severity
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Time
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    {/* Target */}
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-foreground">
                        {getReportTarget(report)}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4">
                      <span className="text-sm text-foreground">
                        {formatReportType(report.report_type)}
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={getSeverityVariant(report.severity)}
                        size="sm"
                      >
                        {report.severity.toUpperCase()}
                      </Badge>
                    </td>

                    {/* Time */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-muted-foreground">
                        {formatTimeAgo(report.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end">
                        <Button
                          size="xs"
                          variant="outline"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => onReview?.(report.id)}
                        >
                          Review
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

