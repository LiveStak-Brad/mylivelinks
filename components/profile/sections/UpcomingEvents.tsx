/**
 * Upcoming Events / Shows (Musician + Comedian)
 *
 * IMPORTANT:
 * - No mock data for visitors.
 * - Owner actions must be wired to real forms + persistence via callbacks.
 */

'use client';

import { Calendar, ExternalLink, MapPin, Pencil, Trash2 } from 'lucide-react';
import { getEmptyStateText } from '@/lib/mockDataProviders';
import type { ProfileType } from '@/lib/profileTypeConfig';

export type ShowEventRow = {
  id: string;
  title: string;
  date?: string | null;
  location?: string | null;
  ticket_url?: string | null;
  description?: string | null;
};

interface UpcomingEventsProps {
  profileType?: ProfileType;
  isOwner?: boolean;
  events?: ShowEventRow[];
  onAddEvent?: () => void;
  onEditEvent?: (event: ShowEventRow) => void;
  onDeleteEvent?: (eventId: string) => void;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
}

export default function UpcomingEvents({
  profileType,
  isOwner = false,
  events = [],
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
}: UpcomingEventsProps) {
  const emptyState = getEmptyStateText('upcoming_events', profileType);
  const sectionTitle = profileType === 'comedian' ? '📅 Upcoming Shows' : '📅 Upcoming Events';

  if (!events.length) {
    if (!isOwner) return null;
    return (
      <div
        className={`backdrop-blur-sm ${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            {sectionTitle}
          </h2>
        </div>

        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{emptyState.title}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{emptyState.text}</p>
          {typeof onAddEvent === 'function' && (
            <button
              onClick={onAddEvent}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              {emptyState.ownerCTA || 'Add Event'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`backdrop-blur-sm ${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6`}
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
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            + Add
          </button>
        )}
      </div>

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
    </div>
  );
}


