/**
 * StatCard Component
 * Displays a single KPI metric with optional delta indicator
 */

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  delta?: number; // positive/negative change
  deltaLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  variant = 'default',
  loading = false,
}: StatCardProps) {
  const variantClasses = {
    default: 'text-gray-600 dark:text-gray-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  const iconBgClasses = {
    default: 'bg-gray-100 dark:bg-gray-800',
    success: 'bg-green-100 dark:bg-green-900/20',
    warning: 'bg-yellow-100 dark:bg-yellow-900/20',
    danger: 'bg-red-100 dark:bg-red-900/20',
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-32 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
            <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
            {delta !== undefined && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-sm font-medium ${
                    delta > 0
                      ? 'text-green-600 dark:text-green-400'
                      : delta < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {delta > 0 ? '+' : ''}
                  {delta}
                </span>
                {deltaLabel && (
                  <span className="text-xs text-muted-foreground">{deltaLabel}</span>
                )}
              </div>
            )}
          </div>
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBgClasses[variant]}`}
          >
            <Icon className={`w-6 h-6 ${variantClasses[variant]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


