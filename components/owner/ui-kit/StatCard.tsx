import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  subtitle?: string;
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  className = '',
}: StatCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}

          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.direction === 'up' ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend.direction === 'up' ? 'text-success' : 'text-destructive'
                }`}
              >
                {trend.value > 0 ? '+' : ''}{trend.value.toFixed(2)}%
              </span>
              {trend.label && (
                <span className="text-xs text-muted-foreground ml-1">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>

        {Icon && (
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        )}
      </div>
    </Card>
  );
}


