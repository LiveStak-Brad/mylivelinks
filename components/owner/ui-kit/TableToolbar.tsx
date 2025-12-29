import { ReactNode } from 'react';
import { Search, Filter } from 'lucide-react';

interface TableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  className?: string;
}

export default function TableToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  actions,
  filters,
  className = '',
}: TableToolbarProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 mb-4 ${className}`}>
      {/* Search Input */}
      {onSearchChange && (
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
      )}

      {/* Filters */}
      {filters && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {filters}
        </div>
      )}

      {/* Action Buttons */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

