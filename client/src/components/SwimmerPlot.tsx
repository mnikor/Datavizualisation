import type {
  AxisConfig,
  GridlineConfig,
  ReferenceLineConfig,
  ShadedRegionConfig,
  AnnotationConfig,
  SeriesOverrideConfig,
} from '@shared/schema';
import type { TypographyPresetStyles } from '@/lib/typographyPresets';

interface SwimmerDataPoint {
  patient: string;
  startTime: number;
  endTime: number;
  response?: 'CR' | 'PR' | 'SD' | 'PD';
  events?: { time: number; type: string; color?: string }[];
}

interface SwimmerPlotProps {
  data: SwimmerDataPoint[];
  colors: readonly string[];
  showLabels: boolean;
  bgColor: string;
  xAxisLabel?: string;
  gridLines?: GridlineConfig;
  axis?: {
    x?: AxisConfig;
    y?: AxisConfig;
  };
  referenceLines?: ReferenceLineConfig[];
  shadedRegions?: ShadedRegionConfig[];
  annotations?: AnnotationConfig[];
  seriesOverrides?: Record<string, SeriesOverrideConfig>;
  typography?: TypographyPresetStyles;
}

export default function SwimmerPlot({
  data,
  colors,
  showLabels,
  bgColor,
  xAxisLabel,
  gridLines,
  axis,
  referenceLines,
  shadedRegions,
  annotations,
  seriesOverrides,
  typography,
}: SwimmerPlotProps) {
  const typographyTheme: TypographyPresetStyles = typography || {
    titleFontFamily: 'Inter, sans-serif',
    titleFontSize: '1.125rem',
    keyMessageFontFamily: 'Inter, sans-serif',
    keyMessageFontSize: '0.875rem',
    axisLabelFontFamily: 'Inter, sans-serif',
    axisLabelFontSize: '0.75rem',
    tickFontFamily: 'Inter, sans-serif',
    tickFontSize: '0.6875rem',
    legendFontFamily: 'Inter, sans-serif',
    legendFontSize: '0.75rem',
    captionFontFamily: 'Inter, sans-serif',
    captionFontSize: '0.75rem',
  };

  const resolvedGrid = {
    showX: gridLines?.showX ?? true,
    showY: gridLines?.showY ?? true,
    dashed: gridLines?.dashed ?? false,
  };

  const scaleValue = (value: number, scale: 'linear' | 'log') => {
    if (scale === 'log') {
      return Math.log10(Math.max(value, Number.EPSILON));
    }
    return value;
  };

  const inverseScaleValue = (value: number, scale: 'linear' | 'log') => {
    if (scale === 'log') {
      return 10 ** value;
    }
    return value;
  };

  const xScale = axis?.x?.scale ?? 'linear';

  
  // Handle empty dataset
  if (data.length === 0) {
    return (
      <div style={{ backgroundColor: bgColor, padding: '20px' }} data-testid="chart-swimmer">
        <p
          style={{
            textAlign: 'center',
            color: 'hsl(var(--muted-foreground))',
            fontFamily: typographyTheme.tickFontFamily,
            fontSize: typographyTheme.tickFontSize,
          }}
        >
          No data available
        </p>
      </div>
    );
  }
  
  const sortedData = [...data].sort((a, b) => (b.endTime - b.startTime) - (a.endTime - a.startTime));
  const rawTimes = sortedData.flatMap((d) => [d.startTime, d.endTime, ...(d.events?.map((e) => e.time) || [])]);
  const fallbackMin = rawTimes.length ? Math.min(...rawTimes) : 0;
  const fallbackMax = rawTimes.length ? Math.max(...rawTimes) : 1;

  const scaledMin = axis?.x?.min !== undefined ? scaleValue(axis.x.min, xScale) : scaleValue(fallbackMin, xScale);
  const scaledMax = axis?.x?.max !== undefined ? scaleValue(axis.x.max, xScale) : scaleValue(fallbackMax, xScale);

  const minTime = inverseScaleValue(Math.min(scaledMin, scaledMax), xScale);
  const maxTime = inverseScaleValue(Math.max(scaledMin, scaledMax), xScale) || 1;

  const plotHeight = 30;
  const totalHeight = sortedData.length * plotHeight + 80;
  const plotWidth = 800;
  const labelWidth = 120;
  const chartWidth = plotWidth - labelWidth - 40;

  const domainRange = scaleValue(maxTime, xScale) - scaleValue(minTime, xScale) || 1;

  const getXPosition = (time: number) => {
    const scaledValue = scaleValue(time, xScale);
    return labelWidth + ((scaledValue - scaleValue(minTime, xScale)) / domainRange) * chartWidth;
  };

  const getResponseColor = (response?: string) => {
    switch (response) {
      case 'CR': return '#10b981'; // Green
      case 'PR': return '#3b82f6'; // Blue
      case 'PD': return '#ef4444'; // Red
      case 'SD': return '#6b7280'; // Gray
      default: return colors[0];
    }
  };

  const tickCount = 6;
  const xTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const scaledTick = scaleValue(minTime, xScale) + (domainRange * i) / tickCount;
    return inverseScaleValue(scaledTick, xScale);
  });

  const buildAxisLabel = (axisConfig?: AxisConfig, provided?: string, fallback?: string) => {
    const value = axisConfig?.label ?? provided ?? fallback;
    if (!value) return null;
    return value;
  };

  const patientOverride = (patient: string) => seriesOverrides?.[patient];

  const rowBase = 40;

  const renderReferenceLines = () =>
    referenceLines?.map((reference) => {
      if (reference.axis === 'x') {
        const x = getXPosition(reference.value);
        return (
          <g key={reference.id}>
            <line
              x1={x}
              x2={x}
              y1={rowBase - 20}
              y2={totalHeight - 50}
              stroke={reference.color || 'hsl(var(--muted-foreground))'}
              strokeDasharray={reference.dashed ? '4 4' : undefined}
            />
            {reference.label && (
              <text
                x={x + 4}
                y={rowBase - 24}
                fontFamily={typographyTheme.legendFontFamily}
                fontSize={typographyTheme.legendFontSize}
                fill={reference.color || 'hsl(var(--foreground))'}
              >
                {reference.label}
              </text>
            )}
          </g>
        );
      }

      if (reference.axis === 'y') {
        const y = rowBase + clamp(reference.value, 0, sortedData.length) * plotHeight;
        return (
          <g key={reference.id}>
            <line
              x1={labelWidth}
              x2={plotWidth - 20}
              y1={y}
              y2={y}
              stroke={reference.color || 'hsl(var(--muted-foreground))'}
              strokeDasharray={reference.dashed ? '4 4' : undefined}
            />
            {reference.label && (
              <text
                x={plotWidth - 24}
                y={y - 4}
                textAnchor="end"
                fontFamily={typographyTheme.legendFontFamily}
                fontSize={typographyTheme.legendFontSize}
                fill={reference.color || 'hsl(var(--foreground))'}
              >
                {reference.label}
              </text>
            )}
          </g>
        );
      }

      return null;
    }) ?? null;

  const renderShadedRegions = () =>
    shadedRegions?.map((region) => {
      if (region.axis !== 'x') return null;
      const x1 = getXPosition(region.start);
      const x2 = getXPosition(region.end);
      return (
        <rect
          key={region.id}
          x={Math.min(x1, x2)}
          y={rowBase - 20}
          width={Math.abs(x2 - x1)}
          height={totalHeight - 70}
          fill={region.color || '#3b82f6'}
          fillOpacity={clamp(region.opacity ?? 0.15, 0, 1)}
        />
      );
    }) ?? null;

  const renderAnnotations = () =>
    annotations?.map((annotation) => {
      const x = getXPosition(annotation.x);
      const yIndex = annotation.y ?? 0;
      const y = rowBase + clamp(yIndex, 0, sortedData.length) * plotHeight;
      return (
        <g key={annotation.id}>
          <circle cx={x} cy={y} r={4} fill={annotation.color || '#111827'} />
          <text
            x={x + 6}
            y={y + 4}
            fontFamily={typographyTheme.tickFontFamily}
            fontSize={typographyTheme.tickFontSize}
            fill={annotation.color || '#111827'}
          >
            {annotation.text}
          </text>
        </g>
      );
    }) ?? null;

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  return (
    <div style={{ backgroundColor: bgColor, padding: '20px', overflow: 'auto' }} data-testid="chart-swimmer">
      <svg width={plotWidth} height={totalHeight}>
        {renderShadedRegions()}
        {renderReferenceLines()}
        {/* X-axis */}
        <line
          x1={labelWidth}
          y1={totalHeight - 50}
          x2={plotWidth - 20}
          y2={totalHeight - 50}
          stroke="hsl(var(--foreground))"
          strokeWidth={1}
        />

        {/* X-axis ticks */}
        {xTicks.map((time, index) => {
          const x = getXPosition(time);
          return (
            <g key={index}>
              <line x1={x} y1={totalHeight - 50} x2={x} y2={totalHeight - 45} stroke="hsl(var(--foreground))" />
              <text
                x={x}
                y={totalHeight - 30}
                textAnchor="middle"
                fontFamily={typographyTheme.tickFontFamily}
                fontSize={typographyTheme.tickFontSize}
                fill="hsl(var(--foreground))"
              >
                {Number.isFinite(time) ? parseFloat(time.toFixed(1)) : time}
              </text>
              {resolvedGrid.showX && (
                <line
                  x1={x}
                  x2={x}
                  y1={rowBase - 20}
                  y2={totalHeight - 50}
                  stroke="hsl(var(--border))"
                  strokeDasharray={resolvedGrid.dashed ? '3 3' : undefined}
                  opacity={0.5}
                />
              )}
            </g>
          );
        })}

        {/* X-axis label */}
        {showLabels && (
          <text
            x={(labelWidth + plotWidth - 20) / 2}
            y={totalHeight - 10}
            textAnchor="middle"
            fontFamily={typographyTheme.axisLabelFontFamily}
            fontSize={typographyTheme.axisLabelFontSize}
            fontWeight={600}
            fill="hsl(var(--foreground))"
          >
            {buildAxisLabel(axis?.x, xAxisLabel, 'Time (months)')}
          </text>
        )}

        {/* Patient labels */}
        <text
          x={10}
          y={15}
          fontFamily={typographyTheme.legendFontFamily}
          fontSize={typographyTheme.legendFontSize}
          fontWeight={600}
          fill="hsl(var(--foreground))"
        >
          {axis?.y?.label ?? 'Patient'}
        </text>

        {/* Swimmer lanes */}
        {sortedData.map((item, index) => {
          const y = 40 + index * plotHeight;
          const x1 = getXPosition(item.startTime);
          const x2 = getXPosition(item.endTime);
          const seriesOverride = patientOverride(item.patient);
          const barColor = seriesOverride?.color ?? getResponseColor(item.response);
          const strokeWidth = seriesOverride?.strokeWidth ?? 0.5;

          return (
            <g key={index}>
              {/* Patient label */}
              <text
                x={10}
                y={y + 5}
                fontFamily={typographyTheme.tickFontFamily}
                fontSize={typographyTheme.tickFontSize}
                fill="hsl(var(--foreground))"
              >
                {item.patient}
              </text>

              {resolvedGrid.showY && (
                <line
                  x1={labelWidth}
                  x2={plotWidth - 20}
                  y1={y}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeDasharray={resolvedGrid.dashed ? '3 3' : undefined}
                  opacity={0.4}
                />
              )}

              {/* Treatment duration bar */}
              <rect
                x={x1}
                y={y - 6}
                width={x2 - x1}
                height={12}
                fill={barColor}
                stroke="hsl(var(--foreground))"
                strokeWidth={strokeWidth}
                opacity={0.8}
              />

              {/* Event markers */}
              {item.events?.map((event, eventIdx) => {
                const eventX = getXPosition(event.time);
                const eventColor = event.color || '#f59e0b';
                return (
                  <g key={eventIdx}>
                    <circle
                      cx={eventX}
                      cy={y}
                      r={4}
                      fill={eventColor}
                      stroke="hsl(var(--background))"
                      strokeWidth={1}
                    />
                    <title>{event.type} at {event.time} months</title>
                  </g>
                );
              })}

              {/* End marker */}
              <polygon
                points={`${x2},${y - 8} ${x2 + 6},${y} ${x2},${y + 8}`}
                fill={barColor}
                stroke="hsl(var(--foreground))"
                strokeWidth={strokeWidth}
              />
            </g>
          );
        })}

        {/* Legend */}
        {showLabels && (
          <g transform={`translate(${labelWidth}, 10)`}>
            <rect x={0} y={0} width={12} height={12} fill="#10b981" />
            <text
              x={18}
              y={10}
              fontFamily={typographyTheme.legendFontFamily}
              fontSize={typographyTheme.legendFontSize}
              fill="hsl(var(--foreground))"
            >
              CR
            </text>
            
            <rect x={60} y={0} width={12} height={12} fill="#3b82f6" />
            <text
              x={78}
              y={10}
              fontFamily={typographyTheme.legendFontFamily}
              fontSize={typographyTheme.legendFontSize}
              fill="hsl(var(--foreground))"
            >
              PR
            </text>
            
            <rect x={120} y={0} width={12} height={12} fill="#6b7280" />
            <text
              x={138}
              y={10}
              fontFamily={typographyTheme.legendFontFamily}
              fontSize={typographyTheme.legendFontSize}
              fill="hsl(var(--foreground))"
            >
              SD
            </text>
            
            <rect x={180} y={0} width={12} height={12} fill="#ef4444" />
            <text
              x={198}
              y={10}
              fontFamily={typographyTheme.legendFontFamily}
              fontSize={typographyTheme.legendFontSize}
              fill="hsl(var(--foreground))"
            >
              PD
            </text>
            
            <circle cx={266} cy={6} r={4} fill="#f59e0b" stroke="hsl(var(--background))" />
            <text
              x={278}
              y={10}
              fontFamily={typographyTheme.legendFontFamily}
              fontSize={typographyTheme.legendFontSize}
              fill="hsl(var(--foreground))"
            >
              Event
            </text>
          </g>
        )}

        {renderAnnotations()}
      </svg>
    </div>
  );
}
