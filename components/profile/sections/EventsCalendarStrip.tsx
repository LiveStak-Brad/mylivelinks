'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, MapPin, Clock, Bell, ExternalLink } from 'lucide-react';

const DAYS_PER_PAGE = 5;
const TOTAL_PAGES = 7;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface CalendarEvent {
  id: string;
  title: string | null;
  start_at: string;
  end_at?: string | null;
  location?: string | null;
  url?: string | null;
  notes?: string | null;
  profile_id: string;
}

interface EventsCalendarStripProps {
  events?: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onSetReminder?: (event: CalendarEvent) => void;
  buttonColor?: string;
  isOwnProfile?: boolean;
}

interface PageData {
  days: Date[];
}

function getPagesData(today: Date): PageData[] {
  const pages: PageData[] = [];
  
  const centerPageStart = new Date(today);
  centerPageStart.setDate(centerPageStart.getDate() - 2);
  centerPageStart.setHours(0, 0, 0, 0);
  
  const startDate = new Date(centerPageStart);
  startDate.setDate(startDate.getDate() - (3 * DAYS_PER_PAGE));
  
  for (let p = 0; p < TOTAL_PAGES; p++) {
    const days: Date[] = [];
    for (let d = 0; d < DAYS_PER_PAGE; d++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + (p * DAYS_PER_PAGE) + d);
      days.push(day);
    }
    pages.push({ days });
  }
  
  return pages;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getEventsForDate(date: Date, events: CalendarEvent[]): CalendarEvent[] {
  const dateStr = date.toISOString().split('T')[0];
  return events.filter(e => e.start_at.startsWith(dateStr));
}

export default function EventsCalendarStrip({
  events = [],
  selectedDate,
  onDateSelect,
  onSetReminder,
  buttonColor = '#3B82F6',
  isOwnProfile = false,
}: EventsCalendarStripProps) {
  const today = useMemo(() => new Date(), []);
  const [currentPageIndex, setCurrentPageIndex] = useState(3);
  const pages = useMemo(() => getPagesData(today), [today]);
  
  const goToPrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };
  
  const goToNextPage = () => {
    if (currentPageIndex < TOTAL_PAGES - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };
  
  const currentMonth = pages[currentPageIndex]?.days[2]?.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }) || '';
  
  const currentPage = pages[currentPageIndex];
  
  return (
    <div className="mb-4">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPrevPage}
          disabled={currentPageIndex === 0}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <span className="text-base font-bold text-gray-900 dark:text-white">
          {currentMonth}
        </span>
        <button
          onClick={goToNextPage}
          disabled={currentPageIndex === TOTAL_PAGES - 1}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
      
      {/* Calendar Days - 5 per page, Taller Card Style */}
      <div className="grid grid-cols-5 gap-2">
        {currentPage?.days.map((day, dayIdx) => {
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const dayEvents = getEventsForDate(day, events);
          const hasEvent = dayEvents.length > 0;
          const dayName = DAY_NAMES[day.getDay()];
          const firstEvent = dayEvents[0];
          
          return (
            <div
              key={dayIdx}
              onClick={() => onDateSelect?.(day)}
              className={`
                flex flex-col rounded-xl border transition-all cursor-pointer overflow-hidden
                ${isToday ? 'min-h-[140px]' : 'min-h-[130px]'}
                ${isSelected 
                  ? 'text-white border-transparent shadow-md' 
                  : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
                ${isToday && !isSelected 
                  ? 'border-2 shadow-lg scale-[1.02]' 
                  : 'border-gray-200 dark:border-gray-700'
                }
              `}
              style={{
                backgroundColor: isSelected ? buttonColor : undefined,
                borderColor: isToday && !isSelected ? buttonColor : undefined,
              }}
            >
              {/* Day Header - Underlined */}
              <div className={`
                text-center py-2 border-b
                ${isSelected ? 'border-white/20' : 'border-gray-200 dark:border-gray-700'}
              `}>
                <span
                  className={`
                    block font-semibold uppercase
                    ${isToday ? 'text-xs' : 'text-[10px]'}
                    ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}
                  `}
                >
                  {dayName}
                </span>
                <span
                  className={`
                    block font-bold
                    ${isToday ? 'text-2xl' : 'text-lg'}
                    ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}
                  `}
                >
                  {day.getDate()}
                </span>
              </div>
              
              {/* Event Space - Shows full info on web */}
              <div className="flex-1 p-2 flex flex-col justify-center">
                {hasEvent ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <CheckCircle className={`w-3 h-3 flex-shrink-0 ${isSelected ? 'text-white' : 'text-green-500'}`} />
                      <span className={`text-[10px] font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {firstEvent?.title || 'Event'}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                      <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="text-[9px]">
                        {new Date(firstEvent.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    {firstEvent?.location && (
                      <div className={`flex items-center gap-1 ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="text-[9px] truncate">{firstEvent.location}</span>
                      </div>
                    )}
                    {dayEvents.length > 1 && (
                      <span className={`text-[9px] ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
                        +{dayEvents.length - 1} more
                      </span>
                    )}
                    {!isOwnProfile && onSetReminder && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetReminder(firstEvent);
                        }}
                        className={`
                          flex items-center gap-1 text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded
                          ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}
                        `}
                      >
                        <Bell className="w-2.5 h-2.5" />
                        Remind
                      </button>
                    )}
                  </div>
                ) : (
                  <span className={`text-center text-sm ${isSelected ? 'text-white/30' : 'text-gray-300 dark:text-gray-600'}`}>
                    —
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
