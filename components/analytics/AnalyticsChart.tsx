'use client';

import { useMemo } from 'react';

export interface ChartDataPoint {
  label: string;
  value: number;
  value2?: number;
}

export interface AnalyticsChartProps {
  title: string;
  data: ChartDataPoint[];
  type?: 'line' | 'bar' | 'area' | 'stacked';
  height?: number;
  colors?: { primary: string; secondary?: string };
  loading?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  legend?: { primary: string; secondary?: string };
}

export default function AnalyticsChart({
  title,
  data,
  type = 'line',
  height = 200,
  colors = { primary: '#a855f7', secondary: '#ec4899' },
  loading = false,
  valuePrefix = '',
  valueSuffix = '',
  legend,
}: AnalyticsChartProps) {
  const { maxValue, minValue, points, points2, areaPath, areaPath2 } = useMemo(() => {
    if (!data.length) return { maxValue: 0, minValue: 0, points: '', points2: '', areaPath: '', areaPath2: '' };
    
    const allValues = data.flatMap(d => [d.value, d.value2 ?? 0]);
    const max = Math.max(...allValues) * 1.1 || 100;
    const min = Math.min(0, ...allValues);
    
    const chartWidth = 100;
    const chartHeight = height - 40;
    const padding = 10;
    
    const getX = (i: number) => padding + (i / Math.max(data.length - 1, 1)) * (chartWidth - padding * 2);
    const getY = (v: number) => padding + (1 - (v - min) / (max - min)) * (chartHeight - padding * 2);
    
    const pts = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
    const pts2 = data.map((d, i) => `${getX(i)},${getY(d.value2 ?? 0)}`).join(' ');
    
    // Area paths
    const firstX = getX(0);
    const lastX = getX(data.length - 1);
    const bottomY = chartHeight - padding;
    
    const area1 = `M ${firstX},${bottomY} L ${pts.split(' ').map(p => `L ${p}`).join(' ')} L ${lastX},${bottomY} Z`.replace('L L', 'L');
    const area2 = `M ${firstX},${bottomY} L ${pts2.split(' ').map(p => `L ${p}`).join(' ')} L ${lastX},${bottomY} Z`.replace('L L', 'L');
    
    return { maxValue: max, minValue: min, points: pts, points2: pts2, areaPath: area1, areaPath2: area2 };
  }, [data, height]);

  const formatValue = (v: number) => {
    if (v >= 1000000) return `${valuePrefix}${(v / 1000000).toFixed(1)}M${valueSuffix}`;
    if (v >= 1000) return `${valuePrefix}${(v / 1000).toFixed(1)}K${valueSuffix}`;
    return `${valuePrefix}${v.toLocaleString()}${valueSuffix}`;
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="animate-pulse">
          <div className="h-5 w-32 bg-muted rounded mb-4" />
          <div className="h-[200px] bg-muted/50 rounded" />
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
          No data available
        </div>
      </div>
    );
  }

  const chartHeight = height - 40;

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {legend && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }} />
              <span className="text-muted-foreground">{legend.primary}</span>
            </div>
            {legend.secondary && colors.secondary && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.secondary }} />
                <span className="text-muted-foreground">{legend.secondary}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-10 w-12 flex flex-col justify-between text-[10px] text-muted-foreground">
          <span>{formatValue(maxValue)}</span>
          <span>{formatValue(maxValue / 2)}</span>
          <span>{formatValue(0)}</span>
        </div>
        
        {/* Chart area */}
        <div className="ml-12">
          <svg 
            viewBox={`0 0 100 ${chartHeight}`} 
            className="w-full"
            style={{ height: chartHeight }}
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            <line x1="10" y1="10" x2="90" y2="10" stroke="#374151" strokeWidth="0.5" />
            <line x1="10" y1={chartHeight / 2} x2="90" y2={chartHeight / 2} stroke="#374151" strokeWidth="0.5" />
            <line x1="10" y1={chartHeight - 10} x2="90" y2={chartHeight - 10} stroke="#374151" strokeWidth="0.5" />
            
            {/* Area fills */}
            {(type === 'area' || type === 'stacked') && (
              <>
                <path d={areaPath} fill={colors.primary} opacity="0.2" />
                {data[0]?.value2 !== undefined && (
                  <path d={areaPath2} fill={colors.secondary || colors.primary} opacity="0.2" />
                )}
              </>
            )}
            
            {/* Lines */}
            <polyline
              points={points}
              fill="none"
              stroke={colors.primary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {data[0]?.value2 !== undefined && (
              <polyline
                points={points2}
                fill="none"
                stroke={colors.secondary || colors.primary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={type === 'line' ? '4,2' : undefined}
              />
            )}
            
            {/* Data points */}
            {type === 'line' && data.map((d, i) => {
              const x = 10 + (i / Math.max(data.length - 1, 1)) * 80;
              const y = 10 + (1 - d.value / maxValue) * (chartHeight - 20);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={colors.primary}
                  className="hover:r-4 transition-all"
                />
              );
            })}
          </svg>
          
          {/* X-axis labels */}
          <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-2">
            {data.length <= 7 ? (
              data.map((d, i) => (
                <span key={i}>{d.label}</span>
              ))
            ) : (
              <>
                <span>{data[0]?.label}</span>
                <span>{data[Math.floor(data.length / 2)]?.label}</span>
                <span>{data[data.length - 1]?.label}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}








