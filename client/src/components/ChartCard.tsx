import { Settings, Trash2, Download, Info, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ChartRenderer from './ChartRenderer';
import InsightsPanel from './InsightsPanel';
import DataQualityWarning from './DataQualityWarning';
import { colorPalettes, type PaletteKey } from '@/lib/chartPalettes';
import { typographyPresets } from '@/lib/typographyPresets';

import type { Chart } from '@shared/schema';

interface ChartCardProps {
  chart: Chart;
  onSettings: () => void;
  onDelete: () => void;
  onExport: () => void;
  onFullView: () => void;
  onChartClick?: (data: any) => void;
}

export default function ChartCard({ chart, onSettings, onDelete, onExport, onFullView, onChartClick }: ChartCardProps) {
  const colors = colorPalettes[chart.palette].colors;
  const typography = typographyPresets[chart.typographyPreset || 'default'];

  return (
    <Card className="overflow-hidden" data-testid={`card-chart-${chart.id}`} data-chart-id={chart.id}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1" data-chart-content={chart.id}>
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                {chart.figureNumber && (
                  <span
                    className="uppercase tracking-wide text-muted-foreground text-xs"
                    style={{ fontFamily: typography.captionFontFamily, fontSize: typography.captionFontSize }}
                  >
                    {chart.figureNumber}
                  </span>
                )}
                <h3
                  className="text-foreground"
                  data-testid="text-chart-title"
                  style={{ fontFamily: typography.titleFontFamily, fontSize: typography.titleFontSize, fontWeight: 600 }}
                >
                  {chart.title}
                </h3>
              </div>
              <p
                className="text-muted-foreground mt-2"
                data-testid="text-key-message"
                style={{ fontFamily: typography.keyMessageFontFamily, fontSize: typography.keyMessageFontSize }}
              >
                {chart.keyMessage}
              </p>
            </div>

            {(chart.data && chart.data.length > 0) || (chart.type === 'study-schema' && chart.schemaData) ? (
              <ChartRenderer
                key={`${chart.palette}-${(chart.schemaType && chart.schemaType !== 'study-design') ? chart.schemaType : 'consort'}-${chart.id}`}
                type={chart.type}
                data={chart.data}
                colors={colors}
                showLabels={chart.showLabels}
                showLegend={chart.showLegend}
                transparentBg={chart.transparentBg}
                xAxisLabel={chart.xAxisLabel}
                yAxisLabel={chart.yAxisLabel}
                tableBorders={chart.tableBorders}
                tableStriped={chart.tableStriped}
                tableCompact={chart.tableCompact}
                schemaType={(chart.schemaType && chart.schemaType !== 'study-design') ? chart.schemaType : 'consort'}
                schemaData={(() => {
                  if (!chart.schemaData) return undefined;
                  if (!chart.schemaType || chart.schemaType === 'study-design' || chart.schemaType === 'consort') {
                    return {
                      ...chart.schemaData,
                      consortOrientation: chart.schemaData.consortOrientation ?? 'vertical',
                    };
                  }
                  return chart.schemaData;
                })()}
                barOrientation={chart.barOrientation}
                gridLines={chart.gridLines}
                axis={chart.axis}
                referenceLines={chart.referenceLines}
                shadedRegions={chart.shadedRegions}
                annotations={chart.annotations}
                seriesOverrides={chart.seriesOverrides}
                typography={typography}
                onChartClick={onChartClick}
              />
            ) : (
              <DataQualityWarning message={chart.dataIssue || 'No data available'} />
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={onSettings}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onFullView}
              data-testid="button-full-view"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onExport}
              data-testid="button-export"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              data-testid="button-delete"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
      {(chart.caption || chart.captionSource) && (
        <div className="px-6 pb-6 space-y-2" style={{ fontFamily: typography.captionFontFamily }}>
          {chart.caption && (
            <p
              className="text-sm text-foreground"
              style={{
                fontSize: typography.captionFontSize,
                fontStyle: typography.captionItalic ? 'italic' : 'normal',
              }}
            >
              {chart.caption}
            </p>
          )}
          {chart.captionSource && (
            <p
              className="text-xs text-muted-foreground"
              style={{ fontSize: `calc(${typography.captionFontSize} - 0.125rem)` }}
            >
              Source: {chart.captionSource}
            </p>
          )}
        </div>
      )}
      {chart.insights && (
        <InsightsPanel title={chart.insights.title} points={chart.insights.points} />
      )}
    </Card>
  );
}
