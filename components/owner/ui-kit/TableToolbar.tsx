import { ReactNode } from 'react';
import { Search, Filter } from 'lucide-react';

type TableToolbarFilter = {
  label: string;
  active: boolean;
  onClick: () => void;
};

type TableToolbarAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
};

interface TableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: ReactNode | TableToolbarAction[];
  filters?: ReactNode | TableToolbarFilter[];
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
  const renderFilters = () => {
    if (!filters) return null;
    if (Array.isArray(filters)) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={f.onClick}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                f.active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-foreground hover:bg-accent-hover'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      );
    }
    return filters;
  };

  const renderActions = () => {
    if (!actions) return null;
    if (Array.isArray(actions)) {
      return (
        <div className="flex items-center gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              disabled={a.disabled}
              title={a.tooltip}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-foreground hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {a.label}
            </button>
          ))}
        </div>
      );
    }
    return actions;
  };

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
          {renderFilters()}
        </div>
      )}

      {/* Action Buttons */}
      {actions && <div className="flex items-center gap-2">{renderActions()}</div>}
    </div>
  );
}


