'use client';

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  loading = false,
}: KpiCardProps) {
  const variantStyles = {
    default: 'border-gray-700',
    success: 'border-green-500/50 bg-green-500/5',
    warning: 'border-yellow-500/50 bg-yellow-500/5',
    danger: 'border-red-500/50 bg-red-500/5',
    info: 'border-blue-500/50 bg-blue-500/5',
  };

  const iconBgStyles = {
    default: 'bg-gray-700',
    success: 'bg-green-500/20',
    warning: 'bg-yellow-500/20',
    danger: 'bg-red-500/20',
    info: 'bg-blue-500/20',
  };

  const trendColor = trend
    ? trend.value > 0
      ? 'text-green-400'
      : trend.value < 0
      ? 'text-red-400'
      : 'text-gray-400'
    : '';

  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl p-6 border ${variantStyles[variant]}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 w-24 bg-gray-700 rounded" />
            <div className="h-10 w-10 bg-gray-700 rounded-lg" />
          </div>
          <div className="h-8 w-32 bg-gray-700 rounded mb-2" />
          <div className="h-3 w-20 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-xl p-6 border ${variantStyles[variant]} hover:border-gray-600 transition`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-400">{title}</span>
        {icon && (
          <div className={`p-2.5 rounded-lg ${iconBgStyles[variant]}`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl md:text-3xl font-bold text-white mb-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        
        {trend && TrendIcon && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            {trend.label && (
              <span className="text-xs text-gray-500 ml-1">{trend.label}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}






