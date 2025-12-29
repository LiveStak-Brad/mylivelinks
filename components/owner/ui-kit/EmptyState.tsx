import { ReactNode } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'default' | 'error';
  className?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  const iconColor = variant === 'error' ? 'text-destructive' : 'text-muted-foreground';
  const IconComponent = variant === 'error' ? AlertCircle : Icon;

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className={`w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4`}>
        <IconComponent className={`w-8 h-8 ${iconColor}`} />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

