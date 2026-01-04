export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'escalated';

export type SupportTicketSeverity = 'low' | 'medium' | 'high' | 'critical';

export type SupportMessageRole = 'user' | 'staff' | 'assistant';

export interface SupportProfileSummary {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface SupportAISummary {
  summary: string | null;
  category: string | null;
  severity: SupportTicketSeverity | null;
  followups: string[];
}

export interface SupportBadgeCounts {
  open: number;
  escalated: number;
  highSeverity: number;
}

export interface SupportTicketSummary {
  id: string;
  reporterProfileId: string;
  assignedTo: string | null;
  status: SupportTicketStatus;
  source: string;
  message: string;
  context: Record<string, any> | null;
  aiSummary: SupportAISummary | null;
  aiModel: string | null;
  aiDurationMs: number | null;
  aiError: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: SupportProfileSummary | null;
  assignee: SupportProfileSummary | null;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  messages: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderProfileId: string | null;
  role: SupportMessageRole;
  message: string;
  metadata: Record<string, any> | null;
  createdAt: string;
  sender: SupportProfileSummary | null;
}

export interface SupportTicketFilters {
  status?: SupportTicketStatus | 'all';
  severity?: SupportTicketSeverity | 'all';
  category?: string | null;
  search?: string | null;
}

export interface SupportTicketListResponse {
  tickets: SupportTicketSummary[];
  badges: SupportBadgeCounts;
  total: number;
  limit: number;
  offset: number;
}
