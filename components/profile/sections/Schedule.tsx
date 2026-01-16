/**
 * Stream Schedule Section (Streamer)
 *
 * Backed by `profile_content_blocks` with block_type = 'schedule_item'.
 */

'use client';

import { Calendar, Pencil, Trash2 } from 'lucide-react';

export type ScheduleItemRow = {
  id: string;
  title: string;
  day_of_week?: string | null;
  time?: string | null;
  description?: string | null;
  recurring?: boolean | null;
};

interface ScheduleProps {
  isOwner?: boolean;
  items?: ScheduleItemRow[];
  onAdd?: () => void;
  onEdit?: (item: ScheduleItemRow) => void;
  onDelete?: (itemId: string) => void;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  buttonColor?: string;
}

export default function Schedule({
  isOwner = false,
  items = [],
  onAdd,
  onEdit,
  onDelete,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
  buttonColor = '#DB2777',
}: ScheduleProps) {
  if (!items.length) {
    if (!isOwner) return null;
    return (
      <div
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            📅 Stream Schedule
          </h2>
        </div>

        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No schedule yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Add days/times so followers know when you go live.</p>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: buttonColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Schedule
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
      style={cardStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          📅 Stream Schedule
        </h2>
        {isOwner && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: buttonColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Schedule
          </button>
        )}
      </div>

      <div className="space-y-3">
        {items.map((it) => (
          <div
            key={it.id}
            className="p-4 rounded-xl border border-purple-100/60 dark:border-purple-800/30 bg-purple-50 dark:bg-purple-900/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-gray-900 dark:text-white">{it.title}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {[it.day_of_week, it.time].filter(Boolean).join(' • ') || '—'}
                  {it.recurring ? ' • Recurring' : ''}
                </div>
              </div>
              {isOwner && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onEdit?.(it)}
                    className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4 text-purple-700 dark:text-purple-200" />
                  </button>
                  <button
                    onClick={() => onDelete?.(it.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              )}
            </div>
            {it.description ? (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{it.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}


