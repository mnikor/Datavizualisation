import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import TableRenderer from './TableRenderer';
import StudySchemaRenderer from './StudySchemaRenderer';
import ForestPlot from './ForestPlot';
import KaplanMeierPlot from './KaplanMeierPlot';
import WaterfallPlot from './WaterfallPlot';
import SwimmerPlot from './SwimmerPlot';
import BoxPlot from './BoxPlot';
import ScatterWithRegression from './ScatterWithRegression';
import Heatmap from './Heatmap';
import { AlertTriangle } from 'lucide-react';
import { generateColorVariant } from '@/lib/colorUtils';
import type {
  SchemaType,
  StudySchemaData,
  GridlineConfig,
  AxisConfig,
  ReferenceLineConfig,
  ShadedRegionConfig,
  AnnotationConfig,
  SeriesOverrideConfig,
} from '@shared/schema';
import { typographyPresets, type TypographyPresetStyles } from '@/lib/typographyPresets';
import { Layout, Data, Shape, Annotations } from 'plotly.js';

export interface ChartRendererProps {
  type: string;
  data: any[];
  colors: readonly string[];
  showLabels: boolean;
  showLegend: boolean;
  transparentBg: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  tableBorders?: boolean;
  tableStriped?: boolean;
  tableCompact?: boolean;
  schemaType?: SchemaType;
  schemaData?: StudySchemaData;
  barOrientation?: 'horizontal' | 'vertical';
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
  viewMode?: 'default' | 'full';
  onChartClick?: (data: any) => void;
}

const DEFAULT_GRIDLINES: Required<GridlineConfig> = {
  showX: true,
  showY: true,
  dashed: false,
};

const resolveGridlines = (gridLines?: GridlineConfig): Required<GridlineConfig> => ({
  showX: gridLines?.showX ?? DEFAULT_GRIDLINES.showX,
  showY: gridLines?.showY ?? DEFAULT_GRIDLINES.showY,
  dashed: gridLines?.dashed ?? DEFAULT_GRIDLINES.dashed,
});

const parseTypographySize = (value?: string, fallback: string = '12px') => {
  if (!value) return parseInt(fallback);
  return parseInt(value.replace('px', ''));
};

export default function ChartRenderer({
  type,
  data,
  colors,
  showLabels,
  showLegend,
  transparentBg,
  xAxisLabel,
  yAxisLabel,
  tableBorders,
  tableStriped,
  tableCompact,
  schemaType,
  schemaData,
  barOrientation = 'horizontal',
  gridLines,
  axis,
  referenceLines,
  shadedRegions,
  annotations,
  seriesOverrides,
  typography,
  viewMode = 'default',
  onChartClick,
}: ChartRendererProps) {
  const bgColor = transparentBg ? 'transparent' : 'hsl(var(--card))';
  // We need to get the actual hex/rgb value for the background if it's a CSS variable
  // For now, let's assume 'transparent' or a fixed color if we can't easily resolve CSS vars in JS without DOM
  // Plotly needs explicit colors.
  const plotBgColor = transparentBg ? 'rgba(0,0,0,0)' : '#ffffff'; // Fallback, ideally should read from theme
  const paperBgColor = transparentBg ? 'rgba(0,0,0,0)' : '#ffffff';

  const typographyTheme = typography ?? typographyPresets.default;
  const resolvedGrid = resolveGridlines(gridLines);

  const commonLayout: Partial<Layout> = {
    paper_bgcolor: paperBgColor,
    plot_bgcolor: plotBgColor,
    font: {
      family: typographyTheme.tickFontFamily,
      size: parseTypographySize(typographyTheme.tickFontSize, '12px'),
      color: '#000000', // Should be dynamic based on theme
    },
    showlegend: showLegend,
    legend: {
      font: {
        family: typographyTheme.legendFontFamily,
        size: parseTypographySize(typographyTheme.legendFontSize, '12px'),
      },
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'right',
      x: 1
    },
    margin: { t: 40, r: 20, b: 40, l: 120 }, // Increased left margin for better default label visibility
    autosize: true,
  };

  const getAxisLayout = (axisConfig: AxisConfig | undefined, label: string | undefined, showGrid: boolean, isLog: boolean = false, axisType?: string) => ({
    title: {
      text: label,
      font: {
        family: typographyTheme.axisLabelFontFamily,
        size: parseTypographySize(typographyTheme.axisLabelFontSize, '12px'),
        color: '#000000',
      }
    },
    showgrid: showGrid,
    gridcolor: '#e5e7eb', // hsl(var(--border))
    gridwidth: 1,
    zeroline: false,
    automargin: true, // Enable automargin to prevent label truncation
    type: (isLog ? 'log' : (axisConfig?.scale === 'log' ? 'log' : (axisType || '-'))) as any,
    range: axisConfig?.min !== undefined && axisConfig?.max !== undefined ? [axisConfig.min, axisConfig.max] : undefined,
    tickfont: {
      family: typographyTheme.tickFontFamily,
      size: parseTypographySize(typographyTheme.tickFontSize, '12px'),
    }
  });

  const shapes: any[] = [
    ...(referenceLines?.map(line => ({
      type: 'line',
      x0: line.axis === 'x' ? line.value : 0, // Needs proper range handling
      x1: line.axis === 'x' ? line.value : 1, // Needs proper range handling
      y0: line.axis === 'y' ? line.value : 0,
      y1: line.axis === 'y' ? line.value : 1,
      xref: line.axis === 'x' ? 'x' : 'paper',
      yref: line.axis === 'y' ? 'y' : 'paper',
      line: {
        color: line.color || '#9ca3af',
        width: 2,
        dash: line.dashed ? 'dash' : 'solid',
      }
    })) || []),
    ...(shadedRegions?.map(region => ({
      type: 'rect',
      x0: region.axis === 'x' ? region.start : 0,
      x1: region.axis === 'x' ? region.end : 1,
      y0: region.axis === 'y' ? region.start : 0,
      y1: region.axis === 'y' ? region.end : 1,
      xref: region.axis === 'x' ? 'x' : 'paper',
      yref: region.axis === 'y' ? 'y' : 'paper',
      fillcolor: region.color || '#3b82f6',
      opacity: region.opacity ?? 0.15,
      line: { width: 0 }
    })) || [])
  ];

  const plotlyAnnotations: Partial<Annotations>[] = annotations?.map(a => ({
    x: a.x,
    y: a.y,
    text: a.text,
    showarrow: a.showArrow ?? false,
    arrowhead: 2,
    ax: a.ax ?? 0,
    ay: a.ay ?? -40,
    font: {
      family: typographyTheme.tickFontFamily,
      size: parseTypographySize(typographyTheme.tickFontSize, '12px'),
      color: a.color || '#111827',
    },
    bgcolor: 'rgba(255, 255, 255, 0.8)',
    bordercolor: a.color || '#111827',
    borderwidth: 1,
    borderpad: 4,
  })) || [];


  if (type === 'table') {
    return (
      <div
        data-testid="chart-table"
        style={{ backgroundColor: transparentBg ? 'transparent' : bgColor }}
        className="rounded-lg"
      >
        <TableRenderer
          data={data}
          colors={colors}
          tableBorders={tableBorders}
          tableStriped={tableStriped}
          tableCompact={tableCompact}
          transparentBg={transparentBg}
        />
      </div>
    );
  }

  if (type === 'study-schema' || type === 'sankey') {
    if (!schemaData) {
      return (
        <div
          data-testid="chart-study-schema-empty"
          className="flex flex-col items-center justify-center p-8 text-center space-y-4"
          style={{ backgroundColor: transparentBg ? 'transparent' : bgColor }}
        >
          <div className="rounded-full bg-muted p-3">
            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Data Structure Mismatch</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              This chart's data was extracted for a different visualization type.
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              To generate a Sankey diagram, please <strong>create a new chart</strong> and select <strong>"Sankey Diagram"</strong> as the type. This ensures the AI extracts the required patient flow data.
            </p>
          </div>
        </div>
      );
    }

    const resolvedSchemaType = (type === 'sankey' || schemaType === 'sankey') ? 'sankey' : (schemaType || 'consort');

    return (
      <div
        data-testid="chart-study-schema"
        style={{ backgroundColor: transparentBg ? 'transparent' : bgColor }}
        className="rounded-lg"
      >
        <StudySchemaRenderer
          schemaData={resolvedSchemaType === 'consort' ? {
            ...schemaData,
            consortOrientation: schemaData.consortOrientation ?? 'vertical',
          } : schemaData}
          schemaType={resolvedSchemaType as SchemaType}
          colors={colors}
          transparentBg={transparentBg}
        />
      </div>
    );
  }

  // Special components that are not standard charts
  if (type === 'forest-plot') {
    return (
      <ForestPlot
        data={data}
        colors={colors}
        showLabels={showLabels}
        bgColor={bgColor}
        xAxisLabel={xAxisLabel}
        gridLines={gridLines}
        axis={axis}
        referenceLines={referenceLines}
        shadedRegions={shadedRegions}
        annotations={annotations}
        seriesOverrides={seriesOverrides}
        typography={typographyTheme}
      />
    );
  }

  if (type === 'kaplan-meier') {
    return (
      <KaplanMeierPlot
        data={data}
        colors={colors}
        showLabels={showLabels}
        showLegend={showLegend}
        bgColor={bgColor}
        xAxisLabel={xAxisLabel}
        yAxisLabel={yAxisLabel}
        gridLines={gridLines}
        axis={axis}
        referenceLines={referenceLines}
        shadedRegions={shadedRegions}
        annotations={annotations}
        seriesOverrides={seriesOverrides}
        typography={typographyTheme}
      />
    );
  }

  if (type === 'waterfall') {
    return (
      <WaterfallPlot
        data={data}
        colors={colors}
        showLabels={showLabels}
        showLegend={showLegend}
        bgColor={bgColor}
        xAxisLabel={xAxisLabel}
        yAxisLabel={yAxisLabel}
        gridLines={gridLines}
        axis={axis}
        referenceLines={referenceLines}
        shadedRegions={shadedRegions}
        annotations={annotations}
        seriesOverrides={seriesOverrides}
        typography={typographyTheme}
      />
    );
  }

  if (type === 'swimmer') {
    return (
      <SwimmerPlot
        data={data}
        colors={colors}
        showLabels={showLabels}
        bgColor={bgColor}
        xAxisLabel={xAxisLabel}
        gridLines={gridLines}
        axis={axis}
        referenceLines={referenceLines}
        shadedRegions={shadedRegions}
        annotations={annotations}
        seriesOverrides={seriesOverrides}
        typography={typographyTheme}
      />
    );
  }

  if (type === 'scatter') {
    return (
      <ScatterWithRegression
        data={data}
        colors={colors}
        showLabels={showLabels}
        showLegend={showLegend}
        bgColor={bgColor}
        xAxisLabel={xAxisLabel}
        yAxisLabel={yAxisLabel}
        gridLines={gridLines}
        axis={axis}
        referenceLines={referenceLines}
        shadedRegions={shadedRegions}
        annotations={annotations}
        seriesOverrides={seriesOverrides}
        typography={typographyTheme}
      />
    );
  }

  if (type === 'heatmap') {
    return (
      <Heatmap
        data={data}
        colors={colors}
        showLabels={showLabels}
        bgColor={bgColor}
        xAxisLabel={xAxisLabel}
        yAxisLabel={yAxisLabel}
        gridLines={gridLines}
        axis={axis}
        referenceLines={referenceLines}
        shadedRegions={shadedRegions}
        annotations={annotations}
        seriesOverrides={seriesOverrides}
        typography={typographyTheme}
      />
    );
  }

  // Helper to safely parse numbers from data
  const safeNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/,/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Plotly Chart Implementations

  if (type === 'demographics') {
    const isHorizontal = barOrientation === 'horizontal';

    const traces: Data[] = [
      {
        x: isHorizontal ? data.map(d => safeNumber(d.male)) : data.map(d => d.ageGroup),
        y: isHorizontal ? data.map(d => d.ageGroup) : data.map(d => safeNumber(d.male)),
        name: 'Male',
        type: 'bar',
        orientation: isHorizontal ? 'h' : 'v',
        marker: { color: colors[0] }
      },
      {
        x: isHorizontal ? data.map(d => safeNumber(d.female)) : data.map(d => d.ageGroup),
        y: isHorizontal ? data.map(d => d.ageGroup) : data.map(d => safeNumber(d.female)),
        name: 'Female',
        type: 'bar',
        orientation: isHorizontal ? 'h' : 'v',
        marker: { color: colors[1] }
      }
    ];

    const layout: Partial<Layout> = {
      ...commonLayout,
      barmode: 'group',
      xaxis: getAxisLayout(axis?.x, xAxisLabel || (showLabels ? (isHorizontal ? 'Number of Patients' : 'Age Group') : undefined), resolvedGrid.showX),
      yaxis: getAxisLayout(axis?.y, yAxisLabel || (showLabels ? (isHorizontal ? 'Age Group' : 'Number of Patients') : undefined), resolvedGrid.showY),
      shapes: shapes,
      annotations: plotlyAnnotations,
    };

    return (
      <div style={{ backgroundColor: bgColor }} data-testid="chart-demographics">
        <Plot
          data={traces}
          layout={layout}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
          onClick={onChartClick}
        />
      </div>
    );
  }

  if (type === 'survival') {
    const timeKey = data.length > 0 ? Object.keys(data[0]).find(k => /^(month|time|week|day|visit|t)$/i.test(k)) || Object.keys(data[0])[0] : 'month';

    const dataKeys = data.length > 0 ? Object.keys(data[0]).filter((key) => {
      if (key === timeKey) return false;
      const val = data[0][key];
      return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
    }) : [];

    const traces: Data[] = dataKeys.map((key, index) => ({
      x: data.map(d => safeNumber(d[timeKey])),
      y: data.map(d => safeNumber(d[key])),
      name: key,
      type: 'scatter',
      mode: 'lines',
      fill: 'tozeroy',
      line: { color: colors[index % colors.length], shape: 'hv' },
      marker: { color: colors[index % colors.length] }
    }));

    const layout: Partial<Layout> = {
      ...commonLayout,
      xaxis: getAxisLayout(axis?.x, xAxisLabel || (showLabels ? 'Time' : undefined), resolvedGrid.showX),
      yaxis: getAxisLayout(axis?.y, yAxisLabel || (showLabels ? 'Survival Probability (%)' : undefined), resolvedGrid.showY),
      shapes: shapes,
      annotations: plotlyAnnotations,
    };

    return (
      <div style={{ backgroundColor: bgColor }} data-testid="chart-survival">
        <Plot
          data={traces}
          layout={layout}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
          onClick={onChartClick}
        />
      </div>
    );
  }

  if (type === 'efficacy') {
    const timeKey = data.length > 0 ? Object.keys(data[0]).find(k => /^(week|month|time|day|visit|t)$/i.test(k)) || Object.keys(data[0])[0] : 'week';

    const dataKeys = data.length > 0 ? Object.keys(data[0]).filter((key) => {
      if (key === timeKey) return false;
      const val = data[0][key];
      return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
    }) : [];

    const traces: Data[] = dataKeys.map((key, index) => ({
      x: data.map(d => safeNumber(d[timeKey])),
      y: data.map(d => safeNumber(d[key])),
      name: key,
      type: 'scatter',
      mode: 'lines',
      line: { color: colors[index % colors.length], width: 2 },
    }));

    const layout: Partial<Layout> = {
      ...commonLayout,
      xaxis: getAxisLayout(axis?.x, xAxisLabel || (showLabels ? 'Time' : undefined), resolvedGrid.showX),
      yaxis: getAxisLayout(axis?.y, yAxisLabel || (showLabels ? 'Efficacy Score' : undefined), resolvedGrid.showY),
      shapes: shapes,
      annotations: plotlyAnnotations,
    };

    return (
      <div style={{ backgroundColor: bgColor }} data-testid="chart-efficacy">
        <Plot
          data={traces}
          layout={layout}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
          onClick={onChartClick}
        />
      </div>
    );
  }

  if (type === 'bar') {
    const keys = data.length > 0 ? Object.keys(data[0]) : [];
    let categoryKey = keys.find(key => {
      const val = data[0][key];
      return typeof val === 'string' && isNaN(parseFloat(val));
    });

    if (!categoryKey && keys.length > 1) {
      categoryKey = keys[0];
    }

    const dataKeys = keys.filter(key => {
      if (key === categoryKey) return false;
      const val = data[0][key];
      return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
    });

    if (dataKeys.length === 0 && keys.length === 1 && !categoryKey) {
      dataKeys.push(keys[0]);
    }

    const isHorizontal = barOrientation === 'horizontal';

    const traces: Data[] = dataKeys.map((key, index) => {
      const override = seriesOverrides?.[key];
      const xValues = isHorizontal ? data.map(d => safeNumber(d[key])) : data.map((d, i) => categoryKey ? d[categoryKey] : `Item ${i + 1}`);
      const yValues = isHorizontal ? data.map((d, i) => categoryKey ? d[categoryKey] : `Item ${i + 1}`) : data.map(d => safeNumber(d[key]));

      // If only one series, vary colors by bar. Otherwise, one color per series.
      const barColors = dataKeys.length === 1
        ? data.map((_, i) => colors[i % colors.length])
        : (override?.color ?? colors[index % colors.length]);

      return {
        x: xValues,
        y: yValues,
        name: key,
        type: 'bar',
        orientation: isHorizontal ? 'h' : 'v',
        marker: { color: barColors },
        text: isHorizontal ? xValues : yValues,
        textposition: 'auto',
      };
    });

    const layout: Partial<Layout> = {
      ...commonLayout,
      xaxis: getAxisLayout(axis?.x, xAxisLabel, resolvedGrid.showX, false, isHorizontal ? undefined : 'category'),
      yaxis: getAxisLayout(axis?.y, yAxisLabel, resolvedGrid.showY, false, isHorizontal ? 'category' : undefined),
      shapes: shapes,
      annotations: plotlyAnnotations,
    };

    return (
      <div style={{ backgroundColor: bgColor }} data-testid="chart-bar">
        <Plot
          data={traces}
          layout={layout}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
          onClick={onChartClick}
        />
      </div>
    );
  }

  if (type === 'line') {
    const keys = data.length > 0 ? Object.keys(data[0]) : [];
    let xAxisKey = keys.find(key => {
      const val = data[0][key];
      return typeof val === 'string' && isNaN(parseFloat(val));
    });

    if (!xAxisKey && keys.length > 1) {
      xAxisKey = keys[0];
    }

    const dataKeys = keys.filter(key => {
      if (key === xAxisKey) return false;
      const val = data[0][key];
      return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
    });

    if (dataKeys.length === 0 && keys.length === 1 && !xAxisKey) {
      dataKeys.push(keys[0]);
    }

    const traces: Data[] = dataKeys.map((key, index) => {
      const override = seriesOverrides?.[key];
      return {
        x: data.map((d, i) => xAxisKey ? d[xAxisKey] : `Item ${i + 1}`),
        y: data.map(d => safeNumber(d[key])),
        name: key,
        type: 'scatter',
        mode: 'lines',
        line: {
          color: override?.color ?? colors[index % colors.length],
          width: override?.strokeWidth ?? 2
        }
      };
    });

    const layout: Partial<Layout> = {
      ...commonLayout,
      xaxis: getAxisLayout(axis?.x, xAxisLabel, resolvedGrid.showX),
      yaxis: getAxisLayout(axis?.y, yAxisLabel, resolvedGrid.showY),
      shapes: shapes,
      annotations: plotlyAnnotations,
    };

    return (
      <div style={{ backgroundColor: bgColor }} data-testid="chart-line">
        <Plot
          data={traces}
          layout={layout}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
          onClick={onChartClick}
        />
      </div>
    );
  }

  if (type === 'area') {
    const keys = data.length > 0 ? Object.keys(data[0]) : [];
    let xAxisKey = keys.find(key => {
      const val = data[0][key];
      return typeof val === 'string' && isNaN(parseFloat(val));
    });

    if (!xAxisKey && keys.length > 1) {
      xAxisKey = keys[0];
    }

    const dataKeys = keys.filter(key => {
      if (key === xAxisKey) return false;
      const val = data[0][key];
      return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
    });

    if (dataKeys.length === 0 && keys.length === 1 && !xAxisKey) {
      dataKeys.push(keys[0]);
    }

    const traces: Data[] = dataKeys.map((key, index) => {
      const override = seriesOverrides?.[key];
      return {
        x: data.map((d, i) => xAxisKey ? d[xAxisKey] : `Item ${i + 1}`),
        y: data.map(d => safeNumber(d[key])),
        name: key,
        type: 'scatter',
        mode: 'lines',
        fill: 'tozeroy',
        line: { color: override?.color ?? colors[index % colors.length] },
        marker: { color: override?.color ?? colors[index % colors.length] }
      };
    });

    const layout: Partial<Layout> = {
      ...commonLayout,
      xaxis: getAxisLayout(axis?.x, xAxisLabel, resolvedGrid.showX),
      yaxis: getAxisLayout(axis?.y, yAxisLabel, resolvedGrid.showY),
      shapes: shapes,
      annotations: plotlyAnnotations,
    };

    return (
      <div style={{ backgroundColor: bgColor }} data-testid="chart-area">
        <Plot
          data={traces}
          layout={layout}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
          onClick={onChartClick}
        />
      </div>
    );
  }

  if (type === 'pie') {
    const labelKey = data.length > 0
      ? Object.keys(data[0]).find((key) => typeof data[0][key] === 'string') || 'name'
      : 'name';
    const valueKey = data.length > 0
      ? Object.keys(data[0]).find((key) => typeof data[0][key] === 'number' || (typeof data[0][key] === 'string' && !isNaN(parseFloat(data[0][key])))) || 'value'
      : 'value';

    const traces: Data[] = [{
      labels: data.map(d => d[labelKey]),
      values: data.map(d => safeNumber(d[valueKey])),
      type: 'pie',
      marker: {
        colors: data.map((_, i) => generateColorVariant(colors, i))
      },
      textinfo: showLabels ? 'label+percent' : 'none',
      textposition: 'outside',
    }];

    const layout: Partial<Layout> = {
      ...commonLayout,
      showlegend: showLegend,
    };

    return (
      <div style={{ backgroundColor: bgColor }} data-testid="chart-pie">
        <Plot
          data={traces}
          layout={layout}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
          onClick={onChartClick}
        />
      </div>
    );
  }

  return null;
}
