'use client';

import { AlertCircle } from 'lucide-react';
import { TicketList } from '@/components/owner/support/TicketList';
import { TicketDetail } from '@/components/owner/support/TicketDetail';
import { EmptyState, Button } from '@/components/owner/ui-kit';
import { useOwnerSupportTickets } from '@/hooks/useOwnerSupportInbox';

export default function OwnerSupportInboxPage() {
  const {
    tickets,
    badges,
    filters,
    updateFilters,
    loading,
    error,
    selectedTicketId,
    selectTicket,
    selectedTicket,
    detailLoading,
    statusUpdating,
    messageSending,
    availableStatuses,
    updateStatus,
    addMessage,
    refresh,
  } = useOwnerSupportTickets({ status: 'open' });

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Support Inbox</h1>
        <p className="text-muted-foreground">
          Review Linkler + support submissions. Assign, escalate, and respond without leaving the owner panel.
        </p>
      </div>

      {error && (
        <EmptyState
          icon={AlertCircle}
          title="Unable to load tickets"
          description={error}
          variant="error"
          action={
            <Button variant="primary" onClick={refresh}>
              Retry
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 h-[calc(100vh-220px)]">
        <TicketList
          tickets={tickets}
          badges={badges}
          filters={filters}
          onFiltersChange={updateFilters}
          loading={loading}
          error={error}
          selectedTicketId={selectedTicketId}
          onSelect={selectTicket}
          refresh={refresh}
        />
        <TicketDetail
          ticket={selectedTicket}
          loading={detailLoading}
          statusUpdating={statusUpdating}
          messageSending={messageSending}
          availableStatuses={availableStatuses}
          onStatusChange={(status, assign) => {
            if (!selectedTicket) return Promise.resolve();
            return updateStatus(selectedTicket.id, status, assign);
          }}
          onSendMessage={(payload) => {
            if (!selectedTicket) return Promise.resolve();
            return addMessage(selectedTicket.id, payload);
          }}
        />
      </div>
    </div>
  );
}
