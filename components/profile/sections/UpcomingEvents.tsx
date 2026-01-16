/**
 * Upcoming Events / Shows (Musician + Comedian)
 *
 * IMPORTANT:
 * - No mock data for visitors.
 * - Owner actions must be wired to real forms + persistence via callbacks.
 */

'use client';

import { useMemo } from 'react';
import { Calendar, ExternalLink, MapPin, Pencil, Trash2 } from 'lucide-react';
import { getEmptyStateText } from '@/lib/mockDataProviders';
import type { ProfileType } from '@/lib/profileTypeConfig';
import EventsCalendarStrip, { CalendarEvent } from './EventsCalendarStrip';
import { createBrowserClient } from '@supabase/ssr';

export type ShowEventRow = {
  id: string;
  title: string;
  date?: string | null;
  start_at?: string | null;
  location?: string | null;
  ticket_url?: string | null;
  url?: string | null;
  description?: string | null;
  notes?: string | null;
  profile_id?: string;
};

interface UpcomingEventsProps {
  profileType?: ProfileType;
  isOwner?: boolean;
  events?: ShowEventRow[];
  profileId?: string;
  onAddEvent?: () => void;
  onEditEvent?: (event: ShowEventRow) => void;
  onDeleteEvent?: (eventId: string) => void;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  buttonColor?: string;
}

export default function UpcomingEvents({
  profileType,
  isOwner = false,
  events = [],
  profileId,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
  buttonColor = '#DB2777',
}: UpcomingEventsProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const emptyState = getEmptyStateText('upcoming_events', profileType);
  const sectionTitle = profileType === 'comedian' ? '📅 Upcoming Shows' : '📅 Upcoming Events';

  const calendarEvents: CalendarEvent[] = useMemo(() => 
    events.map(e => ({
      id: e.id,
      title: e.title,
      start_at: e.start_at || e.date || new Date().toISOString(),
      location: e.location,
      url: e.url || e.ticket_url,
      notes: e.notes || e.description,
      profile_id: e.profile_id || profileId || '',
    })), 
    [events, profileId]
  );
  
  const handleSetReminder = async (event: CalendarEvent) => {
    try {
      const { error } = await supabase.rpc('set_event_reminder', {
        p_event_id: event.id,
      });
      
      if (error) throw error;
      
      alert(`Reminder set! You'll be notified on ${new Date(event.start_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} about "${event.title || 'this event'}"`);
    } catch (error: any) {
      console.error('Error setting reminder:', error);
      alert('Could not set reminder. Please try again.');
    }
  };

  return (
    <div
      className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
      style={cardStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          {sectionTitle}
        </h2>
        {isOwner && typeof onAddEvent === 'function' && (
          <button
            onClick={onAddEvent}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: buttonColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Event
          </button>
        )}
      </div>

      {/* Calendar Strip - always visible */}
      <EventsCalendarStrip
        events={calendarEvents}
        buttonColor={buttonColor}
        isOwnProfile={isOwner}
        onSetReminder={handleSetReminder}
      />

      {events.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 dark:text-gray-400">
            {isOwner ? 'Add your first event' : 'No upcoming events'}
          </p>
        </div>
      ) : (
      <div className="space-y-4">
        {events.map((e) => (
          <div
            key={e.id}
            className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{e.title}</h3>
                {e.date ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>{e.date}</span>
                  </div>
                ) : null}
                {e.location ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{e.location}</span>
                  </div>
                ) : null}
              </div>

              {isOwner && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onEditEvent?.(e)}
                    className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4 text-blue-700 dark:text-blue-200" />
                  </button>
                  <button
                    onClick={() => onDeleteEvent?.(e.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              )}
            </div>

            {e.description ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">{e.description}</p>
            ) : null}

            {e.ticket_url ? (
              <a
                href={e.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-sm"
              >
                Get Tickets
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : null}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
