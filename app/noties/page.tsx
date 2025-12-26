'use client';

import { Bell } from 'lucide-react';
import { useNoties } from '@/components/noties';
import { EmptyState } from '@/components/ui';

/**
 * NOTIES PAGE
 * 
 * Dedicated page for notifications (moved from modal).
 * Better for mobile navigation and full-screen experience.
 * 
 * Route: /noties
 */
export default function NotiesPage() {
  const { noties, isLoading, markAllAsRead } = useNoties();

  return (
    <main 
      id="main"
      className="min-h-[calc(100vh-7rem)] bg-background pb-24 md:pb-8"
    >
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-2xl">
        
        {/* Page Header */}
        <header className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" aria-hidden="true" />
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Notifications
              </h1>
            </div>
            
            {noties.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Stay updated with your activity
          </p>
        </header>

        {/* Noties content */}
        <div className="animate-slide-up">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : noties.length === 0 ? (
            <EmptyState
              icon={<Bell className="w-16 h-16" />}
              title="No notifications yet"
              description="When you get notifications, they'll appear here"
            />
          ) : (
            <div className="space-y-2">
              {noties.map((notie) => (
                <div
                  key={notie.id}
                  className={`
                    p-4 rounded-lg border transition-colors
                    ${notie.isRead 
                      ? 'bg-card border-border' 
                      : 'bg-primary/5 border-primary/20'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">
                      {notie.type === 'gift' && '🎁'}
                      {notie.type === 'follow' && '👤'}
                      {notie.type === 'live' && '📹'}
                      {notie.type === 'mention' && '💬'}
                      {notie.type === 'comment' && '💬'}
                      {notie.type === 'level_up' && '⭐'}
                      {notie.type === 'purchase' && '💰'}
                      {notie.type === 'conversion' && '💎'}
                      {notie.type === 'system' && '🔔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        {notie.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notie.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notie.isRead && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

