import { ReactNode } from 'react';
import EmptyState from './EmptyState';

interface Column<T> {
  key: string;
  header?: ReactNode;
  label?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (row: T, index: number) => string;
  renderRow?: (row: T, index: number) => ReactNode;
  loading?: boolean;
  toolbar?: ReactNode;
  emptyState?:
    | ReactNode
    | {
        icon?: any;
        title: string;
        description?: string;
        action?: ReactNode;
      };
  className?: string;
  emptyMessage?: string;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  renderRow,
  loading = false,
  toolbar,
  emptyState,
  className = '',
  emptyMessage = 'No data available',
}: TableProps<T>) {
  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  if (loading) {
    return <div className={`text-center py-12 text-muted-foreground ${className}`}>Loading...</div>;
  }

  if (data.length === 0) {
    if (emptyState && typeof emptyState === 'object' && !('$$typeof' in (emptyState as any))) {
      const es = emptyState as any;
      return (
        <div className={className}>
          <EmptyState icon={es.icon} title={es.title} description={es.description} action={es.action} />
        </div>
      );
    }

    const emptyNode =
      emptyState && typeof emptyState === 'object' && !('$$typeof' in (emptyState as any))
        ? null
        : (emptyState as ReactNode | undefined);

    return (
      <div className={`text-center py-12 text-muted-foreground ${className}`}>{emptyNode ?? emptyMessage}</div>
    );
  }

  const getKey = (row: T, index: number) => {
    if (keyExtractor) return keyExtractor(row, index);
    const anyRow = row as any;
    if (typeof anyRow?.id === 'string') return anyRow.id;
    return String(index);
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      {toolbar}
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-sm font-semibold text-muted-foreground ${getAlignmentClass(
                  column.align
                )}`}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header ?? column.label ?? column.key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            return (
              <tr
                key={getKey(row, index)}
                className="border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors"
              >
                {renderRow
                  ? renderRow(row, index)
                  : columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-3 text-sm text-foreground ${getAlignmentClass(column.align)}`}
                      >
                        {column.render?.(row, index) ?? null}
                      </td>
                    ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export function TableCell({ children, className = '', width, align }: TableCellProps) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  return <td className={`px-4 py-3 text-sm text-foreground ${alignClass} ${width ?? ''} ${className}`}>{children}</td>;
}

interface TableBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}

export function TableBadge({ 
  children, 
  variant = 'default', 
  className = '' 
}: TableBadgeProps) {
  const variantClasses = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    info: 'bg-info/10 text-info',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}


