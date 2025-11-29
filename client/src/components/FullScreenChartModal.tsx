import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartRenderer from './ChartRenderer';
import { typographyPresets } from '@/lib/typographyPresets';
import { colorPalettes } from '@/lib/chartPalettes';
import type { Chart } from '@shared/schema';

interface ChartFullViewContentProps {
  chart: Chart;
  actions?: ReactNode;
  showInsights?: boolean;
}

const FULL_VIEW_HEIGHT_MAP: Partial<Record<Chart['type'], number>> = {
  pie: 560,
  bar: 520,
  line: 520,
  area: 520,
  table: 420,
  demographics: 520,
  efficacy: 520,
  survival: 520,
  'study-schema': 640,
  'forest-plot': 580,
  'kaplan-meier': 580,
  waterfall: 580,
  swimmer: 580,
  'box-plot': 520,
  scatter: 520,
  heatmap: 520,
};

const getFullViewHeight = (type: Chart['type']) => FULL_VIEW_HEIGHT_MAP[type] ?? 540;

const buildRendererProps = (chart: Chart) => {
  const typography = typographyPresets[chart.typographyPreset || 'default'];
  const colors = colorPalettes[chart.palette].colors;
  const rawSchemaType = chart.schemaType;
  const schemaType = rawSchemaType && rawSchemaType !== 'study-design' ? rawSchemaType : 'consort';
  const schemaData =
    schemaType === 'consort' && chart.schemaData
      ? { ...chart.schemaData, consortOrientation: chart.schemaData.consortOrientation ?? 'vertical' }
      : chart.schemaData;

  return {
    type: chart.type,
    data: chart.data ?? [],
    colors,
    showLabels: chart.showLabels,
    showLegend: chart.showLegend,
    transparentBg: chart.transparentBg,
    xAxisLabel: chart.xAxisLabel,
    yAxisLabel: chart.yAxisLabel,
    tableBorders: chart.tableBorders,
    tableStriped: chart.tableStriped,
    tableCompact: chart.tableCompact,
    schemaType,
    schemaData,
    barOrientation: chart.barOrientation,
    gridLines: chart.gridLines,
    axis: chart.axis,
    referenceLines: chart.referenceLines,
    shadedRegions: chart.shadedRegions,
    annotations: chart.annotations,
    seriesOverrides: chart.seriesOverrides,
    typography,
    viewMode: 'full' as const,
  };
};

interface ChartFullViewContentProps {
  chart: Chart;
  actions?: ReactNode;
  showInsights?: boolean;
}

export function ChartFullViewContent({ chart, actions, showInsights }: ChartFullViewContentProps) {
  const typography = typographyPresets[chart.typographyPreset || 'default'];

  return (
    <div className="flex w-full flex-col gap-4" data-testid="chart-full-view">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {chart.figureNumber && (
            <p
              className="text-xs uppercase tracking-wide text-muted-foreground"
              style={{ fontFamily: typography.captionFontFamily, fontSize: typography.captionFontSize }}
            >
              {chart.figureNumber}
            </p>
          )}
          <h2
            className="text-foreground text-2xl font-semibold"
            style={{ fontFamily: typography.titleFontFamily }}
          >
            {chart.title}
          </h2>
          <p
            className="text-muted-foreground"
            style={{ fontFamily: typography.keyMessageFontFamily }}
          >
            {chart.keyMessage}
          </p>
        </div>
        {actions}
      </div>

      <div
        className="rounded-lg border border-border bg-card/80 p-4"
        style={{ minHeight: `${getFullViewHeight(chart.type)}px` }}
      >
        <ChartRenderer
          {...buildRendererProps(chart)}
          key={`full-${chart.id}-${chart.palette}-${chart.typographyPreset}`}
        />
      </div>

      {showInsights && chart.insights && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <h3
            className="font-semibold text-foreground"
            style={{ fontFamily: typography.titleFontFamily }}
          >
            {chart.insights.title}
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {chart.insights.points.map((point, i) => (
              <li key={i} style={{ fontFamily: typography.keyMessageFontFamily }}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface FullScreenChartModalProps {
  chart: Chart;
  onClose: () => void;
  onExport: () => void;
  includeInsights?: boolean;
  onToggleInsights?: (checked: boolean) => void;
}

export default function FullScreenChartModal({
  chart,
  onClose,
  onExport,
  includeInsights = false,
  onToggleInsights
}: FullScreenChartModalProps) {
  const actionButtons = (
    <div className="flex items-center gap-4">
      {onToggleInsights && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="fs-include-insights"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            checked={includeInsights}
            onChange={(e) => onToggleInsights(e.target.checked)}
          />
          <label htmlFor="fs-include-insights" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Include AI Insights
          </label>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onExport}>
          Export
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close full view">
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-6xl rounded-xl bg-card p-4 sm:p-6 shadow-lg">
        <ChartFullViewContent chart={chart} actions={actionButtons} />
      </div>
    </div>
  );
}
