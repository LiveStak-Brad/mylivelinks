'use client';

import { useState } from 'react';
import {
  X,
  AlertTriangle,
  User,
  Flag,
  Calendar,
  MessageSquare,
  ShieldAlert,
  Volume2,
  Ban,
  DollarSign,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Tooltip,
  useToast,
} from '@/components/ui';
import type { Report } from '@/app/owner/reports/page';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/defaultAvatar';

interface ReportDetailPanelProps {
  report: Report;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ReportDetailPanel({
  report,
  onClose,
  onUpdate,
}: ReportDetailPanelProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState(report.admin_notes || '');
  const { toast } = useToast();

  const handleAction = async (action: 'warn' | 'mute' | 'ban' | 'remove_monetization') => {
    // Placeholder - backend not wired yet
    setActionLoading(action);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: 'Action not available',
      description: 'Backend wiring required.',
      variant: 'info',
      duration: 3500,
    });
    setActionLoading(null);
  };

  const handleStatusChange = async (newStatus: 'reviewed' | 'resolved' | 'dismissed') => {
    setActionLoading('status');
    
    try {
      // Map our status to the backend's resolution format
      const resolution = newStatus === 'dismissed' ? 'dismissed' : 'actioned';
      
      const response = await fetch('/api/admin/reports/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          report_id: report.id,
          resolution: resolution,
          note: adminNotes || null,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast({
            title: 'Not allowed',
            description: 'You do not have permission to update reports.',
            variant: 'error',
          });
          return;
        }
        throw new Error('Failed to update report status');
      }

      onUpdate();
    } catch (error) {
      console.error('Error updating report:', error);
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update report status',
        variant: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
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

  return (
    <Card className="sticky top-6">
      {/* Header */}
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Report Details
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ID: {report.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Report Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Report Information
          </h4>
          <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
              <Badge variant="secondary" size="sm" className="capitalize">
                {report.report_type}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Reason</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {report.report_reason.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
              <Badge variant={getStatusColor(report.status) as any} size="sm">
                {report.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Submitted</span>
              <span className="text-sm text-gray-900 dark:text-white">
                {formatDate(report.created_at)}
              </span>
            </div>
            {report.reviewed_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Reviewed</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatDate(report.reviewed_at)}
                </span>
              </div>
            )}
          </div>

          {/* Report Details */}
          {report.report_details && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <span className="font-semibold">Details: </span>
                {report.report_details}
              </p>
            </div>
          )}
        </div>

        {/* Accused User Card */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4" />
            Reported User
          </h4>
          {report.reported_user ? (
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                <Image
                  src={getAvatarUrl(null)}
                  alt={report.reported_user.username}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {report.reported_user.display_name || report.reported_user.username}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  @{report.reported_user.username}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400">
              No user information available
            </div>
          )}
        </div>

        {/* Reporter Card */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Reported By
          </h4>
          {report.reporter ? (
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                <Image
                  src={getAvatarUrl(null)}
                  alt={report.reporter.username}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {report.reporter.display_name || report.reporter.username}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  @{report.reporter.username}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400">
              Anonymous reporter
            </div>
          )}
        </div>

        {/* Related Messages Preview (Placeholder) */}
        {report.report_type === 'chat' && report.context_details && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Related Messages
            </h4>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-l-4 border-purple-500">
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                Message context preview would appear here
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Context ID: {report.context_details}
              </p>
            </div>
          </div>
        )}

        {/* Admin Notes */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Admin Notes
          </h4>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Add internal notes about this report..."
          />
        </div>

        {/* Moderation Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Moderation Actions
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Tooltip content="Send warning to user (not yet implemented)">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAction('warn')}
                disabled={!!actionLoading || !report.reported_user}
                className="w-full flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Warn
              </Button>
            </Tooltip>
            <Tooltip content="Temporarily mute user (not yet implemented)">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAction('mute')}
                disabled={!!actionLoading || !report.reported_user}
                className="w-full flex items-center justify-center gap-2"
              >
                <Volume2 className="w-4 h-4" />
                Mute
              </Button>
            </Tooltip>
            <Tooltip content="Permanently ban user (not yet implemented)">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleAction('ban')}
                disabled={!!actionLoading || !report.reported_user}
                className="w-full flex items-center justify-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Ban
              </Button>
            </Tooltip>
            <Tooltip content="Remove monetization privileges (not yet implemented)">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAction('remove_monetization')}
                disabled={!!actionLoading || !report.reported_user}
                className="w-full flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Remove $$
              </Button>
            </Tooltip>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Actions disabled until backend wiring complete
          </p>
        </div>
      </CardContent>

      {/* Footer - Status Actions */}
      <CardFooter className="flex gap-2">
        {report.status === 'pending' && (
          <>
            <Button
              variant="primary"
              onClick={() => handleStatusChange('resolved')}
              disabled={!!actionLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4" />
              {actionLoading === 'status' ? 'Updating...' : 'Resolve'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleStatusChange('dismissed')}
              disabled={!!actionLoading}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Dismiss
            </Button>
          </>
        )}
        {report.status === 'reviewed' && (
          <>
            <Button
              variant="primary"
              onClick={() => handleStatusChange('resolved')}
              disabled={!!actionLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {actionLoading === 'status' ? 'Updating...' : 'Mark Resolved'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleStatusChange('dismissed')}
              disabled={!!actionLoading}
              className="flex-1"
            >
              Dismiss
            </Button>
          </>
        )}
        {(report.status === 'actioned' || report.status === 'dismissed') && (
          <div className="flex-1 text-center py-2">
            <Badge variant={getStatusColor(report.status) as any}>
              {report.status === 'actioned' ? 'Report Actioned' : 'Report Dismissed'}
            </Badge>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

