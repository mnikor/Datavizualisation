import type {
  AxisConfig,
  GridlineConfig,
  ReferenceLineConfig,
  ShadedRegionConfig,
  AnnotationConfig,
  SeriesOverrideConfig,
} from '@shared/schema';
import type { TypographyPresetStyles } from '@/lib/typographyPresets';

interface HeatmapDataPoint {
  row: string;
  column: string;
  value: number;
}

interface HeatmapProps {
  data: HeatmapDataPoint[];
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const hexToRgb = (hex: string) => {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  if (normalized.length !== 6) return null;
  const bigint = Number.parseInt(normalized, 16);
  if (Number.isNaN(bigint)) return null;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

const interpolateColor = (start: string, end: string, t: number) => {
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);
  if (!startRgb || !endRgb) {
    const base = Math.round(180 + 75 * (t - 0.5));
    return `rgb(${base}, ${base}, 255)`;
  }
  const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * t);
  const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * t);
  const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const getSeriesOverride = (
  overrides: Record<string, SeriesOverrideConfig> | undefined,
  row: string,
  column: string,
) => overrides?.[`${row}-${column}`] ?? overrides?.[row] ?? overrides?.[column];

export default function Heatmap({
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
}: HeatmapProps) {
  const typographyTheme = typography ?? DEFAULT_TYPOGRAPHY;
  const resolvedGrid = resolveGridlines(gridLines);

  if (data.length === 0) {
    return (
      <div style={{ backgroundColor: bgColor, padding: '20px' }} data-testid="chart-heatmap">
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

  const rows = Array.from(new Set(data.map((d) => d.row))).sort();
  const columns = Array.from(new Set(data.map((d) => d.column))).sort();

  const values = data.map((d) => d.value).filter((value) => Number.isFinite(value));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const valueRange = maxValue - minValue || 1;

  const lowColor = colors[0] ?? '#3b82f6';
  const highColor = colors[1] ?? colors[0] ?? '#ef4444';

  const getColor = (value: number, override?: SeriesOverrideConfig) => {
    if (override?.color) {
      return override.color;
    }

    if (valueRange === 0) {
      return interpolateColor(lowColor, highColor, 0.5);
    }

    const normalized = clamp((value - minValue) / valueRange, 0, 1);
    return interpolateColor(lowColor, highColor, normalized);
  };

  const cellSize = 50;
  const labelWidth = 140;
  const labelHeight = 70;
  const plotWidth = labelWidth + columns.length * cellSize + 150;
  const plotHeight = labelHeight + rows.length * cellSize + 80;

  const getColumnCenter = (index: number) => labelWidth + index * cellSize + cellSize / 2;
  const getRowCenter = (index: number) => labelHeight + index * cellSize + cellSize / 2;

  const matrix = new Map<string, number>();
  data.forEach((d) => {
    matrix.set(`${d.row}-${d.column}`, d.value);
  });

  const resolveReferenceElements = () => {
    const elements: JSX.Element[] = [];

    referenceLines?.forEach((reference) => {
      if (reference.axis === 'x') {
        const columnIndex = clamp(Math.round(reference.value), 0, columns.length - 1);
        const x = getColumnCenter(columnIndex);
        elements.push(
          <g key={`ref-x-${reference.id}`}>
            <line
              x1={x}
              x2={x}
              y1={labelHeight}
              y2={labelHeight + rows.length * cellSize}
              stroke={reference.color || 'hsl(var(--muted-foreground))'}
              strokeDasharray={reference.dashed ? '4 4' : undefined}
              strokeWidth={1}
            />
            {reference.label && (
              <text
                x={x + 4}
                y={labelHeight - 8}
                fontFamily={typographyTheme.legendFontFamily}
                fontSize={typographyTheme.legendFontSize}
                fill={reference.color || 'hsl(var(--foreground))'}
              >
                {reference.label}
              </text>
            )}
          </g>,
        );
      } else {
        const rowIndex = clamp(Math.round(reference.value), 0, rows.length - 1);
        const y = getRowCenter(rowIndex);
        elements.push(
          <g key={`ref-y-${reference.id}`}>
            <line
              x1={labelWidth}
              x2={labelWidth + columns.length * cellSize}
              y1={y}
              y2={y}
              stroke={reference.color || 'hsl(var(--muted-foreground))'}
              strokeDasharray={reference.dashed ? '4 4' : undefined}
              strokeWidth={1}
            />
            {reference.label && (
              <text
                x={labelWidth - 6}
                y={y - 6}
                textAnchor="end"
                fontFamily={typographyTheme.legendFontFamily}
                fontSize={typographyTheme.legendFontSize}
                fill={reference.color || 'hsl(var(--foreground))'}
              >
                {reference.label}
              </text>
            )}
          </g>,
        );
      }
    });

    shadedRegions?.forEach((region) => {
      if (region.axis === 'x') {
        const start = clamp(Math.floor(region.start), 0, columns.length - 1);
        const end = clamp(Math.ceil(region.end), 0, columns.length);
        const x = labelWidth + start * cellSize;
        const width = Math.max((end - start) * cellSize, cellSize);
        elements.push(
          <rect
            key={`shade-x-${region.id}`}
            x={x}
            y={labelHeight}
            width={width}
            height={rows.length * cellSize}
            fill={region.color || '#3b82f6'}
            fillOpacity={clamp(region.opacity ?? 0.15, 0, 1)}
          />,
        );
      } else {
        const start = clamp(Math.floor(region.start), 0, rows.length - 1);
        const end = clamp(Math.ceil(region.end), 0, rows.length);
        const y = labelHeight + start * cellSize;
        const height = Math.max((end - start) * cellSize, cellSize);
        elements.push(
          <rect
            key={`shade-y-${region.id}`}
            x={labelWidth}
            y={y}
            width={columns.length * cellSize}
            height={height}
            fill={region.color || '#3b82f6'}
            fillOpacity={clamp(region.opacity ?? 0.15, 0, 1)}
          />,
        );
      }
    });

    annotations?.forEach((annotation) => {
      const colIndex = clamp(Math.round(annotation.x), 0, columns.length - 1);
      const rowIndex = clamp(Math.round(annotation.y), 0, rows.length - 1);
      const x = getColumnCenter(colIndex);
      const y = getRowCenter(rowIndex);
      elements.push(
        <g key={`annotation-${annotation.id}`}>
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
        </g>,
      );
    });

    return elements;
  };

  return (
    <div style={{ backgroundColor: bgColor, padding: '20px', overflow: 'auto' }} data-testid="chart-heatmap">
      <svg width={plotWidth} height={plotHeight}>
        {resolveReferenceElements()}

        {/* Column labels */}
        {columns.map((col, colIndex) => (
          <text
            key={`col-${col}`}
            x={getColumnCenter(colIndex)}
            y={labelHeight - 12}
            textAnchor="end"
            transform={`rotate(-45, ${getColumnCenter(colIndex)}, ${labelHeight - 12})`}
            fontFamily={typographyTheme.tickFontFamily}
            fontSize={typographyTheme.tickFontSize}
            fill="hsl(var(--foreground))"
          >
            {col}
          </text>
        ))}

        {/* Row labels */}
        {rows.map((row, rowIndex) => (
          <text
            key={`row-${row}`}
            x={labelWidth - 12}
            y={getRowCenter(rowIndex) + 4}
            textAnchor="end"
            fontFamily={typographyTheme.tickFontFamily}
            fontSize={typographyTheme.tickFontSize}
            fill="hsl(var(--foreground))"
          >
            {row}
          </text>
        ))}

        {/* Grid lines */}
        {resolvedGrid.showX &&
          columns.map((_, colIndex) => (
            <line
              key={`grid-x-${colIndex}`}
              x1={labelWidth + colIndex * cellSize}
              x2={labelWidth + colIndex * cellSize}
              y1={labelHeight}
              y2={labelHeight + rows.length * cellSize}
              stroke="hsl(var(--border))"
              strokeDasharray={resolvedGrid.dashed ? '3 3' : undefined}
              opacity={0.4}
            />
          ))}

        {resolvedGrid.showY &&
          rows.map((_, rowIndex) => (
            <line
              key={`grid-y-${rowIndex}`}
              x1={labelWidth}
              x2={labelWidth + columns.length * cellSize}
              y1={labelHeight + rowIndex * cellSize}
              y2={labelHeight + rowIndex * cellSize}
              stroke="hsl(var(--border))"
              strokeDasharray={resolvedGrid.dashed ? '3 3' : undefined}
              opacity={0.4}
            />
          ))}

        {/* Heatmap cells */}
        {rows.map((row, rowIndex) =>
          columns.map((column, colIndex) => {
            const value = matrix.get(`${row}-${column}`);
            if (value === undefined) {
              return null;
            }
            const override = getSeriesOverride(seriesOverrides, row, column);
            const x = labelWidth + colIndex * cellSize;
            const y = labelHeight + rowIndex * cellSize;
            const fill = getColor(value, override);
            const textColor = valueRange === 0 || (value - minValue) / valueRange > 0.5 ? '#ffffff' : '#111827';

            return (
              <g key={`cell-${row}-${column}`}>
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  fill={fill}
                  stroke="hsl(var(--border))"
                  strokeWidth={override?.strokeWidth ?? 0.5}
                />
                {showLabels && (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2 + 4}
                    textAnchor="middle"
                    fontFamily={typographyTheme.tickFontFamily}
                    fontSize={typographyTheme.tickFontSize}
                    fill={override?.color ? (override.color === fill ? '#ffffff' : textColor) : textColor}
                  >
                    {value.toFixed(2)}
                  </text>
                )}
              </g>
            );
          }),
        )}

        {/* Color scale legend */}
        <g transform={`translate(${labelWidth + columns.length * cellSize + 20}, ${labelHeight})`}>
          <text
            x={0}
            y={-10}
            fontFamily={typographyTheme.legendFontFamily}
            fontSize={typographyTheme.legendFontSize}
            fontWeight={600}
            fill="hsl(var(--foreground))"
          >
            Scale
          </text>
          {[...Array(10)].map((_, i) => {
            const t = i / 9;
            const value = minValue + t * valueRange;
            const y = i * ((rows.length * cellSize) / 10);
            const height = (rows.length * cellSize) / 10;
            return (
              <g key={`legend-${i}`}>
                <rect
                  x={0}
                  y={y}
                  width={30}
                  height={height}
                  fill={interpolateColor(lowColor, highColor, t)}
                  stroke="hsl(var(--border))"
                  strokeWidth={0.5}
                />
                {i % 3 === 0 && (
                  <text
                    x={35}
                    y={y + height / 2 + 4}
                    fontFamily={typographyTheme.tickFontFamily}
                    fontSize={typographyTheme.tickFontSize}
                    fill="hsl(var(--foreground))"
                  >
                    {value.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Axis labels */}
        {showLabels && (axis?.x?.label || xAxisLabel) && (
          <text
            x={labelWidth + (columns.length * cellSize) / 2}
            y={plotHeight - 20}
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
            x={20}
            y={labelHeight + (rows.length * cellSize) / 2}
            textAnchor="middle"
            fontFamily={typographyTheme.axisLabelFontFamily}
            fontSize={typographyTheme.axisLabelFontSize}
            fontWeight={600}
            fill="hsl(var(--foreground))"
            transform={`rotate(-90, 20, ${labelHeight + (rows.length * cellSize) / 2})`}
          >
            {axis?.y?.label ?? yAxisLabel}
          </text>
        )}
      </svg>
    </div>
  );
}
