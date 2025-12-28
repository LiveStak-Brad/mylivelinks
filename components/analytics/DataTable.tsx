'use client';

import { ReactNode } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  title?: string;
  subtitle?: string;
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  maxRows?: number;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  compact?: boolean;
}

export default function DataTable<T>({
  title,
  subtitle,
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  maxRows,
  onRowClick,
  keyExtractor,
  sortColumn,
  sortDirection,
  onSort,
  compact = false,
}: DataTableProps<T>) {
  const displayData = maxRows ? data.slice(0, maxRows) : data;
  
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  const headerPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {title && (
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="h-5 w-32 bg-gray-700 rounded animate-pulse" />
          </div>
        )}
        <div className="divide-y divide-gray-700">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex items-center gap-4 ${cellPadding}`}>
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className="h-4 bg-gray-700 rounded animate-pulse"
                  style={{ width: col.width || '100px', flex: col.width ? 'none' : 1 }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-gray-700">
          {title && <h3 className="font-semibold text-white">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
      
      {displayData.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700/30 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {columns.map((col) => {
                  const isActive = sortColumn === col.key;
                  const canSort = col.sortable && onSort;
                  
                  return (
                    <th
                      key={col.key}
                      className={`${headerPadding} text-${col.align || 'left'} ${
                        canSort ? 'cursor-pointer hover:text-white transition select-none' : ''
                      }`}
                      style={{ width: col.width }}
                      onClick={() => canSort && onSort(col.key)}
                    >
                      <div className={`flex items-center gap-1 ${
                        col.align === 'right' ? 'justify-end' : 
                        col.align === 'center' ? 'justify-center' : 'justify-start'
                      }`}>
                        <span>{col.header}</span>
                        {canSort && (
                          <span className="opacity-50">
                            {isActive ? (
                              sortDirection === 'asc' ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )
                            ) : (
                              <ChevronsUpDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {displayData.map((row, index) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={`${
                    onRowClick ? 'cursor-pointer hover:bg-gray-700/50' : ''
                  } transition`}
                >
                  {columns.map((col) => {
                    const value = col.render 
                      ? col.render(row, index) 
                      : (row as any)[col.key];
                    
                    return (
                      <td
                        key={col.key}
                        className={`${cellPadding} text-sm ${
                          col.align === 'right' ? 'text-right' : 
                          col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                        style={{ width: col.width }}
                      >
                        <span className="text-gray-200">{value}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {maxRows && data.length > maxRows && (
        <div className="px-6 py-3 border-t border-gray-700 text-center">
          <span className="text-sm text-gray-500">
            Showing {maxRows} of {data.length} entries
          </span>
        </div>
      )}
    </div>
  );
}





