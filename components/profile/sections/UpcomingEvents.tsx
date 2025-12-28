/**
 * Upcoming Events Section (Musician/Comedian Profile Types)
 * 
 * Displays upcoming shows/events with dates, locations, and ticket links.
 * Shows empty state with owner CTA if no events available.
 */

'use client';

import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import { getMockUpcomingEvents, getEmptyStateText, Event } from '@/lib/mockDataProviders';
import { ProfileType } from '@/lib/profileTypeConfig';

interface UpcomingEventsProps {
  profileType?: ProfileType;
  isOwner?: boolean;
  events?: Event[]; // Real data when available
  onAddEvent?: () => void;
  cardStyle?: React.CSSProperties; // Dynamic opacity from settings
  borderRadiusClass?: string;
}

export default function UpcomingEvents({ 
  profileType, 
  isOwner = false,
  events,
  onAddEvent,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
}: UpcomingEventsProps) {
  // Use real data if provided, otherwise fall back to mock data
  const upcomingEvents = events || getMockUpcomingEvents(profileType);
  const emptyState = getEmptyStateText('upcoming_events', profileType);
  const sectionTitle = profileType === 'comedian' ? '📅 Upcoming Shows' : '📅 Upcoming Events';

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Empty state
  if (upcomingEvents.length === 0) {
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
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {emptyState.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {emptyState.text}
          </p>
          {isOwner && (
            <button
              onClick={onAddEvent}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              {emptyState.ownerCTA}
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
        {isOwner && (
          <button
            onClick={onAddEvent}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            + Add Event
          </button>
        )}
      </div>

      <div className="space-y-4">
        {upcomingEvents.map((event) => (
          <div
            key={event.id}
            className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30"
          >
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
              <MapPin className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
            {event.ticketUrl && (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-sm"
              >
                Get Tickets
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

