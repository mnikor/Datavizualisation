import type {
  AxisConfig,
  GridlineConfig,
  ReferenceLineConfig,
  ShadedRegionConfig,
  AnnotationConfig,
  SeriesOverrideConfig,
} from '@shared/schema';
import type { TypographyPresetStyles } from '@/lib/typographyPresets';

interface BoxPlotDataPoint {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: number[];
}

interface BoxPlotProps {
  data: BoxPlotDataPoint[];
  colors: readonly string[];
  showLabels: boolean;
  bgColor: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
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

const DEFAULT_TYPOGRAPHY: TypographyPresetStyles = {
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

const resolveGridlines = (grid?: GridlineConfig) => ({
  showX: grid?.showX ?? true,
  showY: grid?.showY ?? true,
  dashed: grid?.dashed ?? false,
});

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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function BoxPlot({
  data,
  colors,
  showLabels,
  bgColor,
  xAxisLabel,
  yAxisLabel,
  gridLines,
  axis,
  referenceLines,
  shadedRegions,
  annotations,
  seriesOverrides,
  typography,
}: BoxPlotProps) {
  const typographyTheme = typography ?? DEFAULT_TYPOGRAPHY;
  const resolvedGrid = resolveGridlines(gridLines);
  const yScaleType = axis?.y?.scale ?? 'linear';

  if (data.length === 0) {
    return (
      <div style={{ backgroundColor: bgColor, padding: '20px' }} data-testid="chart-box-plot">
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

  const categories = data.map((item) => item.category);
  const categoryIndexMap = new Map<string, number>();
  categories.forEach((category, index) => categoryIndexMap.set(category, index));

  const dataValues = data.flatMap((d) => [d.min, d.max, ...(d.outliers || [])]).filter((value) => Number.isFinite(value));
  const fallbackMin = dataValues.length ? Math.min(...dataValues) : 0;
  const fallbackMax = dataValues.length ? Math.max(...dataValues) : 1;

  const scaledDataMin = scaleValue(fallbackMin, yScaleType);
  const scaledDataMax = scaleValue(fallbackMax, yScaleType);
  const scaledAxisMin = axis?.y?.min !== undefined ? scaleValue(axis.y.min, yScaleType) : undefined;
  const scaledAxisMax = axis?.y?.max !== undefined ? scaleValue(axis.y.max, yScaleType) : undefined;

  const baseMin = scaledAxisMin ?? scaledDataMin;
  const baseMax = scaledAxisMax ?? scaledDataMax;
  const padding = (baseMax - baseMin || 1) * 0.1;

  const domainMin = scaledAxisMin ?? baseMin - padding;
  const domainMax = scaledAxisMax ?? baseMax + padding;
  const domainRange = domainMax - domainMin || 1;

  const plotHeight = 400;
  const plotWidth = Math.max(600, data.length * 120);
  const marginLeft = 60;
  const marginRight = 30;
  const marginTop = 20;
  const marginBottom = showLabels ? 80 : 50;
  const chartHeight = plotHeight - marginTop - marginBottom;
  const chartWidth = plotWidth - marginLeft - marginRight;

  const boxWidth = Math.min(60, (chartWidth / data.length) * 0.6);
  const spacing = chartWidth / data.length;

  const getCategoryCenter = (index: number) => marginLeft + spacing * (index + 0.5);

  const getYPosition = (value: number) => {
    const scaledValue = scaleValue(value, yScaleType);
    const normalized = (scaledValue - domainMin) / domainRange;
    return marginTop + chartHeight * (1 - normalized);
  };

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, index) => {
    const scaledTick = domainMin + (domainRange * index) / yTickCount;
    return inverseScaleValue(scaledTick, yScaleType);
  });

  const seriesOverridesMap = seriesOverrides ?? {};

  const getCategoryOverride = (category: string) => seriesOverridesMap[category];

  const formatTick = (value: number) => (Number.isFinite(value) ? parseFloat(value.toFixed(1)) : value);

  const resolveReferenceLines = () =>
    referenceLines?.map((reference) => {
      if (reference.axis !== 'y') return null;
      const y = getYPosition(reference.value);
      return (
        <g key={reference.id}>
          <line
            x1={marginLeft}
            x2={marginLeft + chartWidth}
            y1={y}
            y2={y}
            stroke={reference.color || 'hsl(var(--muted-foreground))'}
            strokeWidth={1}
            strokeDasharray={reference.dashed ? '4 4' : undefined}
          />
          {reference.label && (
            <text
              x={marginLeft + chartWidth}
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
    }) ?? null;

  const resolveShadedRegions = () =>
    shadedRegions?.map((region) => {
      if (region.axis !== 'y') return null;
      const y1 = getYPosition(region.start);
      const y2 = getYPosition(region.end);
      return (
        <rect
          key={region.id}
          x={marginLeft}
          y={Math.min(y1, y2)}
          width={chartWidth}
          height={Math.abs(y2 - y1)}
          fill={region.color || '#3b82f6'}
          fillOpacity={clamp(region.opacity ?? 0.15, 0, 1)}
        />
      );
    }) ?? null;

  const resolveAnnotationX = (value: unknown) => {
    if (typeof value === 'string') {
      const index = categoryIndexMap.get(value);
      return index !== undefined ? getCategoryCenter(index) : null;
    }
    if (typeof value === 'number' && !Number.isNaN(value)) {
      const index = clamp(Math.round(value), 0, data.length - 1);
      return getCategoryCenter(index);
    }
    return null;
  };

  const resolveAnnotations = () =>
    annotations?.map((annotation) => {
      const x = resolveAnnotationX(annotation.x);
      if (x === null || typeof annotation.y !== 'number') return null;
      const y = getYPosition(annotation.y);
      return (
        <g key={annotation.id}>
          <circle cx={x} cy={y} r={4} fill={annotation.color || '#111827'} />
          <text
            x={x + 6}
            y={y - 6}
            fontFamily={typographyTheme.tickFontFamily}
            fontSize={typographyTheme.tickFontSize}
            fill={annotation.color || '#111827'}
          >
            {annotation.text}
          </text>
        </g>
      );
    }) ?? null;

  return (
    <div style={{ backgroundColor: bgColor, padding: '20px', overflow: 'auto' }} data-testid="chart-box-plot">
      <svg width={plotWidth} height={plotHeight}>
        {resolveShadedRegions()}
        {resolveReferenceLines()}

        {/* Y-axis */}
        <line
          x1={marginLeft}
          y1={marginTop}
          x2={marginLeft}
          y2={marginTop + chartHeight}
          stroke="hsl(var(--foreground))"
          strokeWidth={1}
        />

        {/* X-axis */}
        <line
          x1={marginLeft}
          y1={marginTop + chartHeight}
          x2={marginLeft + chartWidth}
          y2={marginTop + chartHeight}
          stroke="hsl(var(--foreground))"
          strokeWidth={1}
        />

        {/* Y-axis ticks and grid */}
        {yTicks.map((tick, index) => {
          const y = getYPosition(tick);
          return (
            <g key={`y-tick-${index}`}>
              {resolvedGrid.showY && (
                <line
                  x1={marginLeft}
                  x2={marginLeft + chartWidth}
                  y1={y}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeDasharray={resolvedGrid.dashed ? '3 3' : undefined}
                  strokeWidth={0.5}
                  opacity={0.6}
                />
              )}
              <text
                x={marginLeft - 10}
                y={y + 4}
                textAnchor="end"
                fontFamily={typographyTheme.tickFontFamily}
                fontSize={typographyTheme.tickFontSize}
                fill="hsl(var(--foreground))"
              >
                {formatTick(tick)}
              </text>
            </g>
          );
        })}

        {/* X-axis grid lines */}
        {resolvedGrid.showX &&
          categories.map((category, index) => {
            const x = getCategoryCenter(index);
            return (
              <line
                key={`x-grid-${category}`}
                x1={x}
                x2={x}
                y1={marginTop}
                y2={marginTop + chartHeight}
                stroke="hsl(var(--border))"
                strokeDasharray={resolvedGrid.dashed ? '3 3' : undefined}
                strokeWidth={0.5}
                opacity={0.5}
              />
            );
          })}

        {/* Box plots */}
        {data.map((item, index) => {
          const categoryOverride = getCategoryOverride(item.category);
          const color = categoryOverride?.color ?? colors[index % colors.length];
          const whiskerWidth = categoryOverride?.strokeWidth ?? 1.5;
          const boxStrokeWidth = categoryOverride?.strokeWidth ?? 1.5;
          const centerX = getCategoryCenter(index);

          const yMin = getYPosition(item.min);
          const yQ1 = getYPosition(item.q1);
          const yMedian = getYPosition(item.median);
          const yQ3 = getYPosition(item.q3);
          const yMax = getYPosition(item.max);

          return (
            <g key={item.category}>
              {/* Whisker lines */}
              <line x1={centerX} y1={yMin} x2={centerX} y2={yQ1} stroke={color} strokeWidth={whiskerWidth} />
              <line x1={centerX} y1={yQ3} x2={centerX} y2={yMax} stroke={color} strokeWidth={whiskerWidth} />

              {/* Min/Max caps */}
              <line x1={centerX - 10} y1={yMin} x2={centerX + 10} y2={yMin} stroke={color} strokeWidth={whiskerWidth} />
              <line x1={centerX - 10} y1={yMax} x2={centerX + 10} y2={yMax} stroke={color} strokeWidth={whiskerWidth} />

              {/* Box (IQR) */}
              <rect
                x={centerX - boxWidth / 2}
                y={yQ3}
                width={boxWidth}
                height={yQ1 - yQ3}
                fill={color}
                fillOpacity={0.6}
                stroke={color}
                strokeWidth={boxStrokeWidth}
              />

              {/* Median line */}
              <line
                x1={centerX - boxWidth / 2}
                y1={yMedian}
                x2={centerX + boxWidth / 2}
                y2={yMedian}
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
              />

              {/* Outliers */}
              {item.outliers?.map((outlier, outlierIndex) => (
                <circle
                  key={`outlier-${item.category}-${outlierIndex}`}
                  cx={centerX}
                  cy={getYPosition(outlier)}
                  r={3}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                />
              ))}

              {/* Category label */}
              <text
                x={centerX}
                y={marginTop + chartHeight + 20}
                textAnchor="middle"
                fontFamily={typographyTheme.tickFontFamily}
                fontSize={typographyTheme.tickFontSize}
                fill="hsl(var(--foreground))"
              >
                {item.category}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        {showLabels && (axis?.x?.label || xAxisLabel) && (
          <text
            x={marginLeft + chartWidth / 2}
            y={plotHeight - 15}
            textAnchor="middle"
            fontFamily={typographyTheme.axisLabelFontFamily}
            fontSize={typographyTheme.axisLabelFontSize}
            fontWeight={600}
            fill="hsl(var(--foreground))"
          >
            {axis?.x?.label ?? xAxisLabel}
          </text>
        )}

        {showLabels && (axis?.y?.label || yAxisLabel) && (
          <text
            x={15}
            y={marginTop + chartHeight / 2}
            textAnchor="middle"
            fontFamily={typographyTheme.axisLabelFontFamily}
            fontSize={typographyTheme.axisLabelFontSize}
            fontWeight={600}
            fill="hsl(var(--foreground))"
            transform={`rotate(-90, 15, ${marginTop + chartHeight / 2})`}
          >
            {axis?.y?.label ?? yAxisLabel}
          </text>
        )}

        {resolveAnnotations()}
      </svg>
    </div>
  );
}
