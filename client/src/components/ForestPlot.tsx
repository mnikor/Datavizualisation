import { useMemo } from 'react';

import type {
  AxisConfig,
  GridlineConfig,
  ReferenceLineConfig,
  ShadedRegionConfig,
  AnnotationConfig,
  SeriesOverrideConfig,
} from '@shared/schema';
import type { TypographyPresetStyles } from '@/lib/typographyPresets';

interface ForestPlotDataPoint {
  study: string;
  effectSize: number;
  lowerCI: number;
  upperCI: number;
  weight?: number;
}

interface ForestPlotProps {
  data: ForestPlotDataPoint[];
  colors: readonly string[];
  showLabels: boolean;
  bgColor: string;
  xAxisLabel?: string;
  gridLines?: GridlineConfig;
  axis?: {
    x?: AxisConfig;
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

const DEFAULT_REFERENCE_VALUE = 1;
const DEFAULT_TICK_COUNT = 5;

const resolveGridlines = (grid?: GridlineConfig) => ({
  showX: grid?.showX ?? true,
  showY: grid?.showY ?? true,
  dashed: grid?.dashed ?? false,
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

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

export default function ForestPlot({
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
}: ForestPlotProps) {
  const typographyTheme = typography ?? DEFAULT_TYPOGRAPHY;
  const resolvedGrid = resolveGridlines(gridLines);
  const axisStyle = {
    fontFamily: typographyTheme.axisLabelFontFamily,
    fontSize: typographyTheme.axisLabelFontSize,
    fontWeight: 600,
  };
  const tickFont = {
    fontFamily: typographyTheme.tickFontFamily,
    fontSize: typographyTheme.tickFontSize,
  };
  const legendFont = {
    fontFamily: typographyTheme.legendFontFamily,
    fontSize: typographyTheme.legendFontSize,
  };

  const scaleType = axis?.x?.scale ?? 'linear';
  const baseOverride = seriesOverrides?.effectSize;
  const summaryOverride = seriesOverrides?.summary;

  if (data.length === 0) {
    return (
      <div style={{ backgroundColor: bgColor, padding: '20px' }} data-testid="chart-forest-plot">
        <p
          style={{
            textAlign: 'center',
            color: 'hsl(var(--muted-foreground))',
            fontFamily: tickFont.fontFamily,
            fontSize: tickFont.fontSize,
          }}
        >
          No data available
        </p>
      </div>
    );
  }

  const { minValue, maxValue, referenceValue, summary } = useMemo(() => {
    const scaledValues: number[] = [];
    data.forEach((item) => {
      scaledValues.push(scaleValue(item.lowerCI, scaleType));
      scaledValues.push(scaleValue(item.upperCI, scaleType));
      scaledValues.push(scaleValue(item.effectSize, scaleType));
    });

    const fallbackMin = scaledValues.length ? Math.min(...scaledValues) : scaleValue(DEFAULT_REFERENCE_VALUE, scaleType);
    const fallbackMax = scaledValues.length ? Math.max(...scaledValues) : scaleValue(DEFAULT_REFERENCE_VALUE, scaleType);

    const axisMin = axis?.x?.min !== undefined ? scaleValue(axis.x.min, scaleType) : undefined;
    const axisMax = axis?.x?.max !== undefined ? scaleValue(axis.x.max, scaleType) : undefined;

    const computedMin = axisMin ?? fallbackMin;
    const computedMax = axisMax ?? fallbackMax;
    const padding = (computedMax - computedMin || 1) * 0.1;

    const minWithPadding = axisMin ?? computedMin - padding;
    const maxWithPadding = axisMax ?? computedMax + padding;

    const totalWeight = data.reduce((sum, item) => sum + (item.weight || 1), 0);
    if (totalWeight === 0) {
      return {
        minValue: minWithPadding,
        maxValue: maxWithPadding,
        referenceValue: DEFAULT_REFERENCE_VALUE,
        summary: null as null,
      };
    }

    const weightedSum = data.reduce((sum, item) => sum + item.effectSize * (item.weight || 1), 0);
    const summaryEffect = weightedSum / totalWeight;
    const summaryVariance = 1 / totalWeight;
    const summarySE = Math.sqrt(summaryVariance);

    return {
      minValue: minWithPadding,
      maxValue: maxWithPadding,
      referenceValue: DEFAULT_REFERENCE_VALUE,
      summary: {
        study: 'Summary',
        effectSize: summaryEffect,
        lowerCI: summaryEffect - 1.96 * summarySE,
        upperCI: summaryEffect + 1.96 * summarySE,
      },
    };
  }, [axis, data, scaleType]);

  const ticks = useMemo(() => {
    const count = Math.max(2, DEFAULT_TICK_COUNT);
    const range = maxValue - minValue || 1;
    return Array.from({ length: count }, (_, index) => {
      const scaled = minValue + (range * index) / (count - 1 || 1);
      const value = inverseScaleValue(scaled, scaleType);
      return Number.isFinite(value) ? parseFloat(value.toFixed(2)) : value;
    });
  }, [maxValue, minValue, scaleType]);

  const plotHeight = 40;
  const totalHeight = (data.length + 2) * plotHeight + 80;
  const plotWidth = 800;
  const labelWidth = 200;
  const ciWidth = 200;
  const xStart = labelWidth + 30;
  const xEnd = plotWidth - ciWidth - 30;
  const chartWidth = xEnd - xStart;
  const axisRange = maxValue - minValue || 1;
  const rowBase = 40;
  const yStart = 20;
  const yEnd = totalHeight - 60;

  const getXPosition = (value: number) => {
    const scaled = scaleValue(value, scaleType);
    return xStart + ((scaled - minValue) / axisRange) * chartWidth;
  };

  const getStudyOverride = (study: string) => seriesOverrides?.[study];

  const renderReferenceLines = () =>
    referenceLines?.map((reference) => {
      if (reference.axis === 'x') {
        const x = getXPosition(reference.value);
        return (
          <g key={reference.id}>
            <line
              x1={x}
              x2={x}
              y1={yStart}
              y2={yEnd}
              stroke={reference.color || 'hsl(var(--muted-foreground))'}
              strokeWidth={1}
              strokeDasharray={reference.dashed ? '4 4' : undefined}
            />
            {reference.label && (
              <text
                x={x + 4}
                y={yStart + 12}
                fontFamily={legendFont.fontFamily}
                fontSize={legendFont.fontSize}
                fill={reference.color || 'hsl(var(--foreground))'}
              >
                {reference.label}
              </text>
            )}
          </g>
        );
      }

      if (reference.axis === 'y') {
        const y = rowBase + clamp(reference.value, 0, data.length + 1) * plotHeight;
        return (
          <g key={reference.id}>
            <line
              x1={xStart}
              x2={xEnd}
              y1={y}
              y2={y}
              stroke={reference.color || 'hsl(var(--muted-foreground))'}
              strokeWidth={1}
              strokeDasharray={reference.dashed ? '4 4' : undefined}
            />
            {reference.label && (
              <text
                x={xEnd - 4}
                y={y - 4}
                textAnchor="end"
                fontFamily={legendFont.fontFamily}
                fontSize={legendFont.fontSize}
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
          y={yStart}
          width={Math.abs(x2 - x1)}
          height={yEnd - yStart}
          fill={region.color || '#3b82f6'}
          fillOpacity={clamp(region.opacity ?? 0.15, 0, 1)}
        />
      );
    }) ?? null;

  const renderAnnotations = () =>
    annotations?.map((annotation) => {
      const x = getXPosition(annotation.x);
      const rowIndex = annotation.y ?? 0;
      const y = rowBase + clamp(rowIndex, 0, data.length + 1) * plotHeight;
      return (
        <g key={annotation.id}>
          <circle cx={x} cy={y} r={4} fill={annotation.color || '#111827'} />
          <text
            x={x + 6}
            y={y + 4}
            fontFamily={tickFont.fontFamily}
            fontSize={tickFont.fontSize}
            fill={annotation.color || '#111827'}
          >
            {annotation.text}
          </text>
        </g>
      );
    }) ?? null;

  const baseEffectColor = baseOverride?.color ?? colors[0];
  const baseEffectStrokeWidth = baseOverride?.strokeWidth ?? 2;
  const summaryFill = summaryOverride?.color ?? colors[1] ?? colors[0];
  const summaryStrokeWidth = summaryOverride?.strokeWidth ?? 1;

  return (
    <div style={{ backgroundColor: bgColor, padding: '20px', overflow: 'auto' }} data-testid="chart-forest-plot">
      <svg width="100%" height="100%" viewBox={`0 0 ${plotWidth} ${totalHeight}`} style={{ minHeight: totalHeight }}>
        {renderShadedRegions()}
        {renderReferenceLines()}

        <line
          x1={getXPosition(referenceValue)}
          x2={getXPosition(referenceValue)}
          y1={yStart}
          y2={yEnd}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          strokeDasharray="5 5"
        />

        <line
          x1={xStart}
          y1={yEnd}
          x2={xEnd}
          y2={yEnd}
          stroke="hsl(var(--foreground))"
          strokeWidth={1}
        />

        {ticks.map((tick) => {
          const x = getXPosition(tick);
          if (x < xStart || x > xEnd) {
            return null;
          }
          return (
            <g key={tick}>
              <line x1={x} y1={yEnd} x2={x} y2={yEnd - 5} stroke="hsl(var(--foreground))" />
              <text
                x={x}
                y={yEnd + 20}
                textAnchor="middle"
                fontFamily={tickFont.fontFamily}
                fontSize={tickFont.fontSize}
                fill="hsl(var(--foreground))"
              >
                {tick}
              </text>
              {resolvedGrid.showX && (
                <line
                  x1={x}
                  x2={x}
                  y1={yStart}
                  y2={yEnd}
                  stroke="hsl(var(--border))"
                  strokeDasharray={resolvedGrid.dashed ? '3 3' : undefined}
                  opacity={0.5}
                />
              )}
            </g>
          );
        })}

        {showLabels && (
          <text
            x={(xStart + xEnd) / 2}
            y={totalHeight - 15}
            textAnchor="middle"
            fontFamily={axisStyle.fontFamily}
            fontSize={axisStyle.fontSize}
            fontWeight={axisStyle.fontWeight}
            fill="hsl(var(--foreground))"
          >
            {axis?.x?.label ?? xAxisLabel ?? 'Effect Size (95% CI)'}
          </text>
        )}

        <text
          x={10}
          y={15}
          fontFamily={legendFont.fontFamily}
          fontSize={legendFont.fontSize}
          fontWeight={600}
          fill="hsl(var(--foreground))"
        >
          Study
        </text>
        <text
          x={plotWidth - 20}
          y={15}
          textAnchor="end"
          fontFamily={legendFont.fontFamily}
          fontSize={legendFont.fontSize}
          fontWeight={600}
          fill="hsl(var(--foreground))"
        >
          95% CI
        </text>

        {data.map((item, index) => {
          const effectSize = item.effectSize ?? DEFAULT_REFERENCE_VALUE;
          const lowerCI = item.lowerCI ?? effectSize;
          const upperCI = item.upperCI ?? effectSize;
          const study = item.study ?? `Study ${index + 1}`;
          const weight = item.weight ?? 1;
          const y = rowBase + index * plotHeight;
          const override = getStudyOverride(study) ?? baseOverride;
          const strokeColor = override?.color ?? baseEffectColor;
          const strokeWidth = override?.strokeWidth ?? baseEffectStrokeWidth;
          const squareSize = Math.sqrt(Math.max(weight, 0)) * 3;

          const x1 = getXPosition(lowerCI);
          const x2 = getXPosition(upperCI);
          const xCenter = getXPosition(effectSize);

          return (
            <g key={study}>
              {resolvedGrid.showY && (
                <line
                  x1={xStart}
                  x2={xEnd}
                  y1={y}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeDasharray={resolvedGrid.dashed ? '3 3' : undefined}
                  opacity={0.4}
                />
              )}

              <text
                x={10}
                y={y + 5}
                fontFamily={tickFont.fontFamily}
                fontSize={tickFont.fontSize}
                fill="hsl(var(--foreground))"
              >
                {study}
              </text>

              <line x1={x1} y1={y} x2={x2} y2={y} stroke={strokeColor} strokeWidth={strokeWidth} />

              <rect
                x={xCenter - squareSize / 2}
                y={y - squareSize / 2}
                width={squareSize}
                height={squareSize}
                fill={strokeColor}
                stroke="hsl(var(--foreground))"
                strokeWidth={0.5}
              />

              <text
                x={plotWidth - 20}
                y={y + 5}
                textAnchor="end"
                fontFamily={tickFont.fontFamily}
                fontSize={tickFont.fontSize}
                fill="hsl(var(--foreground))"
              >
                {effectSize.toFixed(2)} ({lowerCI.toFixed(2)}, {upperCI.toFixed(2)})
              </text>
            </g>
          );
        })}

        {summary && (
          <g>
            <line
              x1={xStart}
              y1={totalHeight - 80}
              x2={xEnd}
              y2={totalHeight - 80}
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />

            <text
              x={10}
              y={totalHeight - 75}
              fontFamily={legendFont.fontFamily}
              fontSize={legendFont.fontSize}
              fontWeight={700}
              fill="hsl(var(--foreground))"
            >
              {summary.study}
            </text>

            <polygon
              points={`
                ${getXPosition(summary.lowerCI)},${totalHeight - 80}
                ${getXPosition(summary.effectSize)},${totalHeight - 90}
                ${getXPosition(summary.upperCI)},${totalHeight - 80}
                ${getXPosition(summary.effectSize)},${totalHeight - 70}
              `}
              fill={summaryFill}
              stroke="hsl(var(--foreground))"
              strokeWidth={summaryStrokeWidth}
              opacity={0.85}
            />

            <text
              x={plotWidth - 20}
              y={totalHeight - 75}
              textAnchor="end"
              fontFamily={legendFont.fontFamily}
              fontSize={legendFont.fontSize}
              fontWeight={600}
              fill="hsl(var(--foreground))"
            >
              {summary.effectSize.toFixed(2)} ({summary.lowerCI.toFixed(2)}, {summary.upperCI.toFixed(2)})
            </text>
          </g>
        )}

        {renderAnnotations()}
      </svg>
    </div>
  );
}
