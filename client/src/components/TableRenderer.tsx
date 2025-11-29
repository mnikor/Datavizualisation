import { useMemo } from 'react';
import { generateColorVariant, tintColor, shadeColor, getReadableTextColor } from '@/lib/colorUtils';

interface TableRendererProps {
  data: any[];
  colors?: readonly string[];
  tableBorders?: boolean;
  tableStriped?: boolean;
  tableCompact?: boolean;
  transparentBg?: boolean;
}

const DEFAULT_BORDER_COLOR = '#CBD5E1';
const DEFAULT_TEXT_COLOR = '#111827';
const DEFAULT_BACKGROUND = '#ffffff';

export const formatTableLabel = (key: string) =>
  key
    .replace(/_/g, ' ')
    .split(/(?=[A-Z])/)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();

export const formatTableValue = (value: any) => {
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value?.toString() ?? '';
};

export interface TableLayout {
  columns: string[];
  headerLabels: string[];
  rows: string[][];
  columnWidths: number[];
  tableWidth: number;
  tableHeight: number;
  headerHeight: number;
  rowHeight: number;
  cellPaddingX: number;
}

export const computeTableLayout = (
  data: any[],
  tableCompact: boolean
): TableLayout => {
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  const headerLabels = columns.map((column) => formatTableLabel(column));
  const rows = data.map((row) => columns.map((column) => formatTableValue(row[column])));

  const charWidth = tableCompact ? 6.8 : 7.6;
  const cellPaddingX = tableCompact ? 12 : 18;
  const minWidth = tableCompact ? 90 : 110;
  const maxWidth = 320;
  const headerHeight = tableCompact ? 40 : 48;
  const rowHeight = tableCompact ? 32 : 40;

  const columnWidths = columns.map((_, columnIndex) => {
    const headerLength = headerLabels[columnIndex]?.length ?? 0;
    const maxCellLength = rows.reduce((max, row) => Math.max(max, row[columnIndex]?.length ?? 0), 0);
    const maxLength = Math.max(headerLength, maxCellLength);
    const estimatedWidth = maxLength * charWidth + cellPaddingX * 2;
    return Math.max(minWidth, Math.min(maxWidth, estimatedWidth));
  });

  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const tableHeight = headerHeight + rowHeight * rows.length;

  return {
    columns,
    headerLabels,
    rows,
    columnWidths,
    tableWidth,
    tableHeight,
    headerHeight,
    rowHeight,
    cellPaddingX,
  };
};

const useTableLayout = (data: any[], tableCompact: boolean) =>
  useMemo(() => computeTableLayout(data, tableCompact), [data, tableCompact]);

export default function TableRenderer({
  data,
  colors,
  tableBorders = true,
  tableStriped = true,
  tableCompact = false,
  transparentBg = false,
}: TableRendererProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const layout = useTableLayout(data, tableCompact);
  const { columns, columnWidths } = layout;
  const bgColor = transparentBg ? 'transparent' : 'hsl(var(--card))';
  const borderClass = tableBorders ? 'border border-border' : '';
  const paddingClass = tableCompact ? 'px-3 py-1.5' : 'px-4 py-3';

  const palette = colors ?? [];
  const headerBg = palette.length > 0 ? tintColor(generateColorVariant(palette, 0), 0.2) : undefined;
  const headerText = headerBg ? getReadableTextColor(headerBg) : undefined;
  const stripeBase = palette.length > 1 ? generateColorVariant(palette, 1) : palette[0];
  const accentBorder = palette.length > 2 ? shadeColor(generateColorVariant(palette, 2), 0.25) : palette[0];

  const headerStyle = headerBg
    ? {
        backgroundColor: headerBg,
        color: headerText,
        borderBottom: tableBorders ? `2px solid ${accentBorder ?? 'hsl(var(--border))'}` : undefined,
      }
    : undefined;

  const getStripedStyle = (rowIndex: number) => {
    if (!tableStriped || rowIndex % 2 === 0) return undefined;
    if (!stripeBase) return { backgroundColor: 'hsla(var(--muted), 0.3)' };
    return { backgroundColor: tintColor(stripeBase, 0.85) };
  };

  return (
    <div
      className="overflow-x-auto"
      data-testid="chart-table"
      key={`table-${headerBg ?? 'default'}`}
    >
      <table className={`w-full text-sm ${borderClass}`}>
        <thead style={headerStyle}>
          <tr>
            {columns.map((column, columnIndex) => (
              <th
                key={`${columnIndex}-${headerBg ?? 'default'}`}
                style={{
                  borderRight:
                    tableBorders && accentBorder && columnIndex < columns.length - 1
                      ? `1px solid ${accentBorder}`
                      : undefined,
                }}
                className={`text-left font-semibold ${paddingClass} ${
                  tableBorders ? 'border-b-2 border-border' : ''
                }`}
              >
                {formatTableLabel(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            const rowStripedStyle = getStripedStyle(rowIndex);
            return (
              <tr
                key={`${rowIndex}-${stripeBase || 'default'}`}
                style={rowStripedStyle}
                className={`
                  ${tableStriped && rowIndex % 2 === 1 && !stripeBase ? 'bg-muted/30' : ''}
                  ${tableBorders ? 'border-b border-border' : ''}
                  hover-elevate
                `}
              >
                {columns.map((column) => (
                  <td key={column} className={`${paddingClass}`}>
                    {formatTableValue(row[column])}
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

export function TableSvgRenderer({
  data,
  colors,
  tableBorders = true,
  tableStriped = true,
  tableCompact = false,
  transparentBg = false,
}: TableRendererProps) {
  if (!data || data.length === 0) {
    const width = 320;
    const height = 120;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
        <rect width={width} height={height} fill={transparentBg ? 'transparent' : DEFAULT_BACKGROUND} rx="8" />
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={DEFAULT_TEXT_COLOR}
          fontSize="14"
          fontWeight="500"
        >
          No data available
        </text>
      </svg>
    );
  }

  const layout = useTableLayout(data, tableCompact);
  const { columns, headerLabels, rows, columnWidths, tableWidth, tableHeight, headerHeight, rowHeight, cellPaddingX } = layout;
  const palette = colors ?? [];

  const headerBg = palette.length > 0 ? tintColor(generateColorVariant(palette, 0), 0.2) : '#F3F4F6';
  const accentBorder = palette.length > 2 ? shadeColor(generateColorVariant(palette, 2), 0.25) : palette[0] ?? DEFAULT_BORDER_COLOR;
  const headerText = headerBg ? getReadableTextColor(headerBg) : DEFAULT_TEXT_COLOR;
  const borderColor = accentBorder ?? DEFAULT_BORDER_COLOR;
  const stripeBase = palette.length > 1 ? generateColorVariant(palette, 1) : palette[0];
  const stripeFill = stripeBase ? tintColor(stripeBase, 0.85) : '#F8FAFC';
  const textColor = DEFAULT_TEXT_COLOR;

  const totalHeight = tableHeight + (tableBorders ? 2 : 0);
  const totalWidth = tableWidth + (tableBorders ? 2 : 0);

  const columnOffsets = columnWidths.reduce<number[]>((offsets, width, index) => {
    const prevOffset = index === 0 ? 0 : offsets[index - 1] + columnWidths[index - 1];
    offsets.push(prevOffset);
    return offsets;
  }, []);

  return (
    <svg
      data-table-export="true"
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x={0}
        y={0}
        width={totalWidth}
        height={totalHeight}
        fill={transparentBg ? 'transparent' : DEFAULT_BACKGROUND}
        stroke={tableBorders ? borderColor : 'none'}
        rx={8}
      />

      {/* Header background */}
      <rect
        x={tableBorders ? 1 : 0}
        y={tableBorders ? 1 : 0}
        width={tableWidth}
        height={headerHeight}
        fill={headerBg}
      />

      {/* Header text */}
      {columns.map((_, columnIndex) => {
        const x = (tableBorders ? 1 : 0) + columnOffsets[columnIndex];
        const width = columnWidths[columnIndex];
        return (
          <text
            key={`header-${columnIndex}`}
            x={x + cellPaddingX}
            y={(tableBorders ? 1 : 0) + headerHeight / 2}
            dominantBaseline="middle"
            fontSize={tableCompact ? 13 : 14}
            fontWeight={600}
            fill={headerText}
          >
            {headerLabels[columnIndex]}
          </text>
        );
      })}

      {/* Rows */}
      {rows.map((row, rowIndex) => {
        const rowY = (tableBorders ? 1 : 0) + headerHeight + rowIndex * rowHeight;
        const isStriped = tableStriped && rowIndex % 2 === 1;
        return (
          <g key={`row-${rowIndex}`}>
            {isStriped && (
              <rect
                x={tableBorders ? 1 : 0}
                y={rowY}
                width={tableWidth}
                height={rowHeight}
                fill={stripeFill}
              />
            )}
            {row.map((cell, columnIndex) => {
              const x = (tableBorders ? 1 : 0) + columnOffsets[columnIndex];
              return (
                <text
                  key={`cell-${rowIndex}-${columnIndex}`}
                  x={x + cellPaddingX}
                  y={rowY + rowHeight / 2}
                  dominantBaseline="middle"
                  fontSize={tableCompact ? 13 : 14}
                  fill={textColor}
                >
                  {cell}
                </text>
              );
            })}
          </g>
        );
      })}

      {/* Grid lines */}
      {tableBorders && (
        <g stroke={borderColor} strokeWidth={1}>
          {/* Horizontal lines */}
          {Array.from({ length: rows.length + 1 }).map((_, index) => {
            const y = (tableBorders ? 1 : 0) + headerHeight + index * rowHeight;
            return (
              <line
                key={`h-${index}`}
                x1={tableBorders ? 1 : 0}
                x2={(tableBorders ? 1 : 0) + tableWidth}
                y1={y}
                y2={y}
              />
            );
          })}
          {/* Header bottom border */}
          <line
            x1={tableBorders ? 1 : 0}
            x2={(tableBorders ? 1 : 0) + tableWidth}
            y1={(tableBorders ? 1 : 0) + headerHeight}
            y2={(tableBorders ? 1 : 0) + headerHeight}
          />
          {/* Vertical lines */}
          {columnOffsets.slice(1).map((offset, index) => (
            <line
              key={`v-${index}`}
              x1={(tableBorders ? 1 : 0) + offset}
              x2={(tableBorders ? 1 : 0) + offset}
              y1={tableBorders ? 1 : 0}
              y2={(tableBorders ? 1 : 0) + tableHeight}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
