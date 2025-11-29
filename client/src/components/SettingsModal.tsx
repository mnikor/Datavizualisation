import { useMemo, useState } from 'react';
import { X, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ColorPaletteSelector from './ColorPaletteSelector';
import { colorPalettes, type PaletteKey } from '@/lib/chartPalettes';
import { Textarea } from '@/components/ui/textarea';
import type {
  AnnotationConfig,
  ConsortOrientation,
  AxisConfig,
  GridlineConfig,
  ReferenceLineConfig,
  SeriesOverrideConfig,
  ShadedRegionConfig,
  TypographyPreset,
} from '@shared/schema';
import { typographyPresets } from '@/lib/typographyPresets';

interface SettingsModalProps {
  chart: any;
  onClose: () => void;
  onSave: (settings: any) => void;
}

const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'table', label: 'Data Table' },
  { value: 'study-schema', label: 'Study Schema' },
  { value: 'sankey', label: 'Sankey Diagram (Patient Flow)' },
  { value: 'forest-plot', label: 'Forest Plot (Meta-analysis)' },
  { value: 'kaplan-meier', label: 'Kaplan-Meier Curve' },
  { value: 'waterfall', label: 'Waterfall Plot (Tumor Response)' },
  { value: 'swimmer', label: 'Swimmer Plot (Treatment Timeline)' },
  { value: 'box-plot', label: 'Box Plot (Distribution)' },
  { value: 'scatter', label: 'Scatter Plot (Correlation)' },
  { value: 'heatmap', label: 'Heatmap (Correlation Matrix)' }
];

const SCHEMA_TYPES = [
  { value: 'study-design', label: 'Study Design Timeline' },
  { value: 'consort', label: 'CONSORT Flow Diagram' },
  { value: 'sankey', label: 'Sankey Patient Flow' }
];

function validateChartType(type: string, data: any[]): string | null {
  if (type === 'study-schema') {
    return null;
  }

  if (!data || data.length === 0) {
    return 'No data available for this chart';
  }

  const firstItem = data[0];
  const keys = Object.keys(firstItem);

  if (type === 'table') {
    return null;
  }

  if (type === 'pie') {
    const hasLabelField = keys.some(key => typeof firstItem[key] === 'string');
    const hasNumericField = keys.some(key => typeof firstItem[key] === 'number');

    if (!hasLabelField || !hasNumericField) {
      return 'Pie charts require data with at least one label field and one numeric field. Your data structure is not compatible.';
    }
  }

  if (type === 'line' || type === 'area') {
    const hasNumericY = data.every(item => {
      const values = Object.values(item).filter(v => typeof v === 'number');
      return values.length > 0;
    });

    if (!hasNumericY) {
      return 'Line and area charts require numeric data points. Your data may not be suitable.';
    }
  }

  return null;
}

export default function SettingsModal({ chart, onClose, onSave, lastChartClick }: SettingsModalProps) {
  const [title, setTitle] = useState(chart.title);
  const [chartType, setChartType] = useState(chart.type);
  const [showLabels, setShowLabels] = useState(chart.showLabels);
  const [showLegend, setShowLegend] = useState(chart.showLegend);
  const [palette, setPalette] = useState<PaletteKey>(chart.palette);
  const [transparentBg, setTransparentBg] = useState(chart.transparentBg);
  const [chartData, setChartData] = useState(chart.data || []);
  const [xAxisLabel, setXAxisLabel] = useState(chart.xAxisLabel || '');
  const [yAxisLabel, setYAxisLabel] = useState(chart.yAxisLabel || '');
  const [tableBorders, setTableBorders] = useState(chart.tableBorders ?? true);
  const [tableStriped, setTableStriped] = useState(chart.tableStriped ?? true);
  const [tableCompact, setTableCompact] = useState(chart.tableCompact ?? false);
  const [schemaType, setSchemaType] = useState(chart.schemaType || 'consort');
  const [consortOrientation, setConsortOrientation] = useState<ConsortOrientation>(chart.schemaData?.consortOrientation || 'vertical');
  const [barOrientation, setBarOrientation] = useState(chart.barOrientation || 'horizontal');
  const [gridLines, setGridLines] = useState<GridlineConfig>(chart.gridLines ?? { showX: true, showY: true, dashed: false });
  const [axisConfig, setAxisConfig] = useState<{ x?: AxisConfig; y?: AxisConfig }>(chart.axis ?? {});
  const [referenceLines, setReferenceLines] = useState<ReferenceLineConfig[]>(chart.referenceLines ?? []);
  const [shadedRegions, setShadedRegions] = useState<ShadedRegionConfig[]>(chart.shadedRegions ?? []);
  const [annotations, setAnnotations] = useState<AnnotationConfig[]>(chart.annotations ?? []);
  const [seriesOverrides, setSeriesOverrides] = useState<Record<string, SeriesOverrideConfig>>(chart.seriesOverrides ?? {});
  const [typographyPreset, setTypographyPreset] = useState<TypographyPreset>(chart.typographyPreset || 'default');
  const [figureNumber, setFigureNumber] = useState(chart.figureNumber || '');
  const [caption, setCaption] = useState(chart.caption || '');
  const [captionSource, setCaptionSource] = useState(chart.captionSource || '');

  const [pickingAnnotationIndex, setPickingAnnotationIndex] = useState<number | null>(null);

  // Effect to handle chart clicks for annotation positioning
  useEffect(() => {
    if (pickingAnnotationIndex !== null && lastChartClick) {
      updateAnnotation(pickingAnnotationIndex, {
        x: lastChartClick.x,
        y: lastChartClick.y
      });
      setPickingAnnotationIndex(null);
    }
  }, [lastChartClick, pickingAnnotationIndex]);

  // If picking position, hide the modal content but keep it mounted
  const containerClass = pickingAnnotationIndex !== null
    ? "fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pointer-events-none"
    : "fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 sm:p-6 overflow-y-auto";

  const contentClass = pickingAnnotationIndex !== null ? "hidden" : "w-full max-w-4xl rounded-xl bg-card p-6 shadow-lg";

  const validationError = validateChartType(chartType, chartData);

  const hasAxes = ['bar', 'line', 'area', 'demographics', 'efficacy', 'survival', 'forest-plot', 'kaplan-meier', 'waterfall', 'swimmer', 'box-plot', 'scatter', 'heatmap'].includes(chartType);
  const isStudySchema = chartType === 'study-schema';

  const availableSeries = useMemo(() => {
    if (!Array.isArray(chartData) || chartData.length === 0) {
      return [] as string[];
    }

    const sample = chartData[0];
    if (typeof sample !== 'object' || !sample) {
      return [] as string[];
    }

    return Object.keys(sample).filter((key) => typeof sample[key] === 'number');
  }, [chartData]);

  const currentTypography = typographyPresets[typographyPreset];
  const createId = () => Math.random().toString(36).slice(2, 10);

  const sanitizeAxisSide = (side?: AxisConfig) => {
    if (!side) return undefined;
    const { min, max, scale, label } = side;
    if (min === undefined && max === undefined && !scale && !label) {
      return undefined;
    }
    return {
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(scale ? { scale } : {}),
      ...(label ? { label } : {}),
    } as AxisConfig;
  };

  const updateAxisNumeric = (axisKey: 'x' | 'y', field: 'min' | 'max', raw: string) => {
    setAxisConfig((prev) => {
      const next = { ...prev };
      const current: AxisConfig = { ...(next[axisKey] ?? {}) };
      if (raw === '') {
        delete current[field];
      } else {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed)) {
          current[field] = parsed;
        }
      }
      const sanitized = sanitizeAxisSide(current);
      if (sanitized) {
        next[axisKey] = sanitized;
      } else {
        delete next[axisKey];
      }
      return next;
    });
  };

  const updateAxisScale = (axisKey: 'x' | 'y', useLog: boolean) => {
    setAxisConfig((prev) => {
      const next = { ...prev };
      const current: AxisConfig = { ...(next[axisKey] ?? {}) };
      if (useLog) {
        current.scale = 'log';
      } else {
        delete current.scale;
      }
      const sanitized = sanitizeAxisSide(current);
      if (sanitized) {
        next[axisKey] = sanitized;
      } else {
        delete next[axisKey];
      }
      return next;
    });
  };

  const resetAxis = (axisKey: 'x' | 'y') => {
    setAxisConfig((prev) => {
      const next = { ...prev };
      delete next[axisKey];
      return next;
    });
  };

  const toggleGridLine = (key: keyof GridlineConfig, value: boolean) => {
    setGridLines((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateSeriesOverride = (seriesKey: string, update: Partial<SeriesOverrideConfig>) => {
    setSeriesOverrides((prev) => {
      const next = { ...prev };
      const current = { ...(next[seriesKey] ?? {}) };
      const merged = { ...current, ...update } as SeriesOverrideConfig;
      const hasValue =
        merged.color ||
        merged.strokeWidth !== undefined ||
        merged.showConfidenceInterval !== undefined ||
        merged.showTrendLine !== undefined;
      if (hasValue) {
        next[seriesKey] = merged;
      } else {
        delete next[seriesKey];
      }
      return next;
    });
  };

  const removeSeriesOverride = (seriesKey: string) => {
    setSeriesOverrides((prev) => {
      const next = { ...prev };
      delete next[seriesKey];
      return next;
    });
  };

  const updateReferenceLine = (index: number, update: Partial<ReferenceLineConfig>) => {
    setReferenceLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...update } : line)));
  };

  const removeReferenceLine = (index: number) => {
    setReferenceLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateShadedRegion = (index: number, update: Partial<ShadedRegionConfig>) => {
    setShadedRegions((prev) => prev.map((region, i) => (i === index ? { ...region, ...update } : region)));
  };

  const removeShadedRegion = (index: number) => {
    setShadedRegions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAnnotation = (index: number, update: Partial<AnnotationConfig>) => {
    setAnnotations((prev) => prev.map((annotation, i) => (i === index ? { ...annotation, ...update } : annotation)));
  };

  const removeAnnotation = (index: number) => {
    setAnnotations((prev) => prev.filter((_, i) => i !== index));
  };

  const addReferenceLine = () => {
    setReferenceLines((prev) => [
      ...prev,
      {
        id: createId(),
        axis: 'x',
        value: 0,
        label: '',
        color: '#ef4444',
        dashed: false,
      },
    ]);
  };

  const addShadedRegion = () => {
    setShadedRegions((prev) => [
      ...prev,
      {
        id: createId(),
        axis: 'x',
        start: 0,
        end: 1,
        label: '',
        color: '#fde68a',
        opacity: 0.25,
      },
    ]);
  };

  const addAnnotation = () => {
    setAnnotations((prev) => [
      ...prev,
      {
        id: createId(),
        x: 0,
        y: 0,
        text: '',
        color: '#111827',
      },
    ]);
  };

  const handleSave = () => {
    const sanitizedAxis = {
      x: sanitizeAxisSide(axisConfig.x),
      y: sanitizeAxisSide(axisConfig.y),
    };
    const axisPayload = sanitizedAxis.x || sanitizedAxis.y ? sanitizedAxis : undefined;

    onSave({
      title,
      type: chartType,
      showLabels,
      showLegend,
      palette,
      transparentBg,
      data: chartData,
      xAxisLabel: xAxisLabel || undefined,
      yAxisLabel: yAxisLabel || undefined,
      tableBorders,
      tableStriped,
      tableCompact,
      schemaType: isStudySchema ? schemaType : undefined,
      schemaData: isStudySchema
        ? {
          ...chart.schemaData,
          consortOrientation: schemaType === 'consort' ? consortOrientation : undefined,
        }
        : undefined,
      barOrientation: (chartType === 'bar' || chartType === 'demographics') ? barOrientation : undefined,
      gridLines,
      axis: axisPayload,
      referenceLines: referenceLines.length > 0 ? referenceLines : undefined,
      shadedRegions: shadedRegions.length > 0 ? shadedRegions : undefined,
      annotations: annotations.length > 0 ? annotations : undefined,
      seriesOverrides: Object.keys(seriesOverrides).length > 0 ? seriesOverrides : undefined,
      typographyPreset,
      figureNumber: figureNumber || undefined,
      caption: caption || undefined,
      captionSource: captionSource || undefined,
    });
    onClose();
  };

  return (
    <div
      className={containerClass}
      role="dialog"
      aria-modal="true"
    >
      {pickingAnnotationIndex !== null && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg pointer-events-auto flex items-center gap-4 z-[60]">
          <span className="text-sm font-medium">Click on the chart to place annotation</span>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setPickingAnnotationIndex(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className={contentClass}>
        <div className="flex items-center justify-between mb-6 border-b border-border">
          <h2 className="text-xl font-semibold">Chart Settings</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            data-testid="button-close-settings"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Tabs defaultValue="display" className="p-6">
          <TabsList
            className={`grid w-full ${isStudySchema ? 'grid-cols-6' : 'grid-cols-7'}`}
          >
            <TabsTrigger value="display" data-testid="tab-display">
              Display
            </TabsTrigger>
            <TabsTrigger value="axes" data-testid="tab-axes" disabled={!hasAxes}>
              Axes & Grid
            </TabsTrigger>
            <TabsTrigger value="series" data-testid="tab-series" disabled={availableSeries.length === 0}>
              Series
            </TabsTrigger>
            <TabsTrigger value="annotations" data-testid="tab-annotations" disabled={!hasAxes}>
              Annotations
            </TabsTrigger>
            <TabsTrigger value="typography" data-testid="tab-typography">
              Typography
            </TabsTrigger>
            <TabsTrigger value="palette" data-testid="tab-palette">
              Palette
            </TabsTrigger>
            {!isStudySchema && (
              <TabsTrigger value="data" data-testid="tab-data">
                Data
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="display" className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Chart Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-chart-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chart-type">Chart Type</Label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger id="chart-type" data-testid="select-chart-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value} data-testid={`option-chart-type-${type.value}`}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}
            </div>

            {isStudySchema && (
              <div className="space-y-2">
                <Label htmlFor="schema-type">Schema Visualization Type</Label>
                <Select value={schemaType} onValueChange={setSchemaType}>
                  <SelectTrigger id="schema-type" data-testid="select-schema-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEMA_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value} data-testid={`option-schema-type-${type.value}`}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose how to visualize the study structure. Study Design (default) shows a timeline with arms, CONSORT shows patient flow, and Sankey shows allocation patterns.
                </p>
                {schemaType === 'consort' && (
                  <div className="space-y-2 pt-3">
                    <Label htmlFor="consort-orientation">CONSORT Orientation</Label>
                    <Select value={consortOrientation} onValueChange={(value: ConsortOrientation) => setConsortOrientation(value)}>
                      <SelectTrigger id="consort-orientation" data-testid="select-consort-orientation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vertical" data-testid="option-consort-vertical">Vertical (top to bottom)</SelectItem>
                        <SelectItem value="horizontal" data-testid="option-consort-horizontal">Horizontal (left to right)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Vertical orientation mirrors the standard CONSORT flow from enrollment to analysis. Horizontal works well for wide layouts.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="show-labels" className="flex-1">Show Axis Labels</Label>
              <Switch
                id="show-labels"
                checked={showLabels}
                onCheckedChange={setShowLabels}
                data-testid="switch-show-labels"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-legend" className="flex-1">Show Legend</Label>
              <Switch
                id="show-legend"
                checked={showLegend}
                onCheckedChange={setShowLegend}
                data-testid="switch-show-legend"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="transparent-bg" className="flex-1">Transparent Background</Label>
              <Switch
                id="transparent-bg"
                checked={transparentBg}
                onCheckedChange={setTransparentBg}
                data-testid="switch-transparent-bg"
              />
            </div>

            {hasAxes && (
              <>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-4">Axis Labels</p>

                  <div className="space-y-2 mb-3">
                    <Label htmlFor="x-axis-label">X-Axis Label</Label>
                    <Input
                      id="x-axis-label"
                      value={xAxisLabel}
                      onChange={(e) => setXAxisLabel(e.target.value)}
                      placeholder="e.g., Time Points, Groups..."
                      data-testid="input-x-axis-label"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="y-axis-label">Y-Axis Label</Label>
                    <Input
                      id="y-axis-label"
                      value={yAxisLabel}
                      onChange={(e) => setYAxisLabel(e.target.value)}
                      placeholder="e.g., Percentage, Count..."
                      data-testid="input-y-axis-label"
                    />
                  </div>
                </div>
              </>
            )}

            {(chartType === 'bar' || chartType === 'demographics') && (
              <>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-4">Bar Chart Options</p>

                  <div className="space-y-2">
                    <Label htmlFor="bar-orientation">Bar Orientation</Label>
                    <Select value={barOrientation} onValueChange={setBarOrientation}>
                      <SelectTrigger id="bar-orientation" data-testid="select-bar-orientation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horizontal" data-testid="option-bar-orientation-horizontal">
                          Horizontal (bars grow left to right)
                        </SelectItem>
                        <SelectItem value="vertical" data-testid="option-bar-orientation-vertical">
                          Vertical (bars grow bottom to top)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Horizontal orientation shows category labels on the left, vertical shows them at the bottom.
                    </p>
                  </div>
                </div>
              </>
            )}

            {chartType === 'table' && (
              <>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-4">Table Styling</p>

                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor="table-borders" className="flex-1">Show Borders</Label>
                    <Switch
                      id="table-borders"
                      checked={tableBorders}
                      onCheckedChange={setTableBorders}
                      data-testid="switch-table-borders"
                    />
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor="table-striped" className="flex-1">Striped Rows</Label>
                    <Switch
                      id="table-striped"
                      checked={tableStriped}
                      onCheckedChange={setTableStriped}
                      data-testid="switch-table-striped"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="table-compact" className="flex-1">Compact Mode</Label>
                    <Switch
                      id="table-compact"
                      checked={tableCompact}
                      onCheckedChange={setTableCompact}
                      data-testid="switch-table-compact"
                    />
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="axes" className="space-y-6 mt-6">
            {!hasAxes && (
              <p className="text-sm text-muted-foreground">
                Axis controls are not available for this chart type.
              </p>
            )}

            {hasAxes && (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Gridlines</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="grid-x" className="flex-1">Show Vertical Gridlines</Label>
                    <Switch
                      id="grid-x"
                      checked={gridLines.showX ?? true}
                      onCheckedChange={(checked) => toggleGridLine('showX', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="grid-y" className="flex-1">Show Horizontal Gridlines</Label>
                    <Switch
                      id="grid-y"
                      checked={gridLines.showY ?? true}
                      onCheckedChange={(checked) => toggleGridLine('showY', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="grid-dashed" className="flex-1">Dashed Gridlines</Label>
                    <Switch
                      id="grid-dashed"
                      checked={gridLines.dashed ?? false}
                      onCheckedChange={(checked) => toggleGridLine('dashed', checked)}
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">X-Axis Range</h3>
                    <Button size="sm" variant="ghost" onClick={() => resetAxis('x')}>
                      Reset
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="axis-x-min">Min</Label>
                      <Input
                        id="axis-x-min"
                        type="number"
                        value={axisConfig.x?.min ?? ''}
                        onChange={(event) => updateAxisNumeric('x', 'min', event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="axis-x-max">Max</Label>
                      <Input
                        id="axis-x-max"
                        type="number"
                        value={axisConfig.x?.max ?? ''}
                        onChange={(event) => updateAxisNumeric('x', 'max', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="axis-x-log">Logarithmic Scale</Label>
                    <Switch
                      id="axis-x-log"
                      checked={axisConfig.x?.scale === 'log'}
                      onCheckedChange={(checked) => updateAxisScale('x', checked)}
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Y-Axis Range</h3>
                    <Button size="sm" variant="ghost" onClick={() => resetAxis('y')}>
                      Reset
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="axis-y-min">Min</Label>
                      <Input
                        id="axis-y-min"
                        type="number"
                        value={axisConfig.y?.min ?? ''}
                        onChange={(event) => updateAxisNumeric('y', 'min', event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="axis-y-max">Max</Label>
                      <Input
                        id="axis-y-max"
                        type="number"
                        value={axisConfig.y?.max ?? ''}
                        onChange={(event) => updateAxisNumeric('y', 'max', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="axis-y-log">Logarithmic Scale</Label>
                    <Switch
                      id="axis-y-log"
                      checked={axisConfig.y?.scale === 'log'}
                      onCheckedChange={(checked) => updateAxisScale('y', checked)}
                    />
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="series" className="space-y-6 mt-6">
            {availableSeries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No numeric series detected for this chart.
              </p>
            ) : (
              <div className="space-y-6">
                {availableSeries.map((seriesKey, index) => {
                  const override = seriesOverrides[seriesKey] ?? {};
                  const defaultPalette = colorPalettes[palette];
                  const defaultColor = defaultPalette ? defaultPalette.colors[index % defaultPalette.colors.length] : '#3b82f6';

                  return (
                    <div key={seriesKey} className="border border-border rounded-md p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium">{seriesKey}</h3>
                          <p className="text-xs text-muted-foreground">Default color {defaultColor}</p>
                        </div>
                        {seriesOverrides[seriesKey] && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSeriesOverride(seriesKey)}
                            aria-label={`Remove custom settings for ${seriesKey}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`series-color-${seriesKey}`}>Series Color</Label>
                          <Input
                            id={`series-color-${seriesKey}`}
                            type="color"
                            value={override.color ?? defaultColor}
                            onChange={(event) => updateSeriesOverride(seriesKey, { color: event.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`series-width-${seriesKey}`}>Stroke Width</Label>
                          <Input
                            id={`series-width-${seriesKey}`}
                            type="number"
                            min={1}
                            max={6}
                            value={override.strokeWidth ?? ''}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateSeriesOverride(seriesKey, {
                                strokeWidth: value === '' ? undefined : Number(value),
                              });
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                          <Label htmlFor={`series-ci-${seriesKey}`}>Show Confidence Interval</Label>
                          <Switch
                            id={`series-ci-${seriesKey}`}
                            checked={override.showConfidenceInterval ?? false}
                            onCheckedChange={(checked) => updateSeriesOverride(seriesKey, { showConfidenceInterval: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                          <Label htmlFor={`series-trend-${seriesKey}`}>Show Trend Line</Label>
                          <Switch
                            id={`series-trend-${seriesKey}`}
                            checked={override.showTrendLine ?? false}
                            onCheckedChange={(checked) => updateSeriesOverride(seriesKey, { showTrendLine: checked })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="annotations" className="space-y-8 mt-6">
            {!hasAxes && (
              <p className="text-sm text-muted-foreground">
                Annotations require axis-based charts.
              </p>
            )}

            {hasAxes && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Reference Lines</h3>
                    <Button size="sm" onClick={addReferenceLine}>
                      <Plus className="h-4 w-4 mr-1" /> Add line
                    </Button>
                  </div>

                  {referenceLines.length === 0 && (
                    <p className="text-sm text-muted-foreground">No reference lines configured.</p>
                  )}

                  <div className="space-y-4">
                    {referenceLines.map((line, index) => (
                      <div key={line.id} className="border border-border rounded-md p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Line {index + 1}</h4>
                          <Button variant="ghost" size="icon" onClick={() => removeReferenceLine(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor={`ref-axis-${line.id}`}>Axis</Label>
                            <Select value={line.axis} onValueChange={(value: 'x' | 'y') => updateReferenceLine(index, { axis: value })}>
                              <SelectTrigger id={`ref-axis-${line.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="x">X-axis</SelectItem>
                                <SelectItem value="y">Y-axis</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`ref-value-${line.id}`}>Value</Label>
                            <Input
                              id={`ref-value-${line.id}`}
                              type="number"
                              value={line.value}
                              onChange={(event) => updateReferenceLine(index, { value: Number(event.target.value) })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`ref-color-${line.id}`}>Color</Label>
                            <Input
                              id={`ref-color-${line.id}`}
                              type="color"
                              value={line.color ?? '#ef4444'}
                              onChange={(event) => updateReferenceLine(index, { color: event.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`ref-label-${line.id}`}>Label</Label>
                            <Input
                              id={`ref-label-${line.id}`}
                              value={line.label ?? ''}
                              onChange={(event) => updateReferenceLine(index, { label: event.target.value })}
                            />
                          </div>
                          <div className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                            <Label htmlFor={`ref-dashed-${line.id}`}>Dashed</Label>
                            <Switch
                              id={`ref-dashed-${line.id}`}
                              checked={line.dashed ?? false}
                              onCheckedChange={(checked) => updateReferenceLine(index, { dashed: checked })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Shaded Regions</h3>
                    <Button size="sm" onClick={addShadedRegion}>
                      <Plus className="h-4 w-4 mr-1" /> Add region
                    </Button>
                  </div>

                  {shadedRegions.length === 0 && (
                    <p className="text-sm text-muted-foreground">No shaded regions configured.</p>
                  )}

                  <div className="space-y-4">
                    {shadedRegions.map((region, index) => (
                      <div key={region.id} className="border border-border rounded-md p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Region {index + 1}</h4>
                          <Button variant="ghost" size="icon" onClick={() => removeShadedRegion(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label htmlFor={`region-axis-${region.id}`}>Axis</Label>
                            <Select value={region.axis} onValueChange={(value: 'x' | 'y') => updateShadedRegion(index, { axis: value })}>
                              <SelectTrigger id={`region-axis-${region.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="x">X-axis</SelectItem>
                                <SelectItem value="y">Y-axis</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`region-start-${region.id}`}>Start</Label>
                            <Input
                              id={`region-start-${region.id}`}
                              type="number"
                              value={region.start}
                              onChange={(event) => updateShadedRegion(index, { start: Number(event.target.value) })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`region-end-${region.id}`}>End</Label>
                            <Input
                              id={`region-end-${region.id}`}
                              type="number"
                              value={region.end}
                              onChange={(event) => updateShadedRegion(index, { end: Number(event.target.value) })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`region-color-${region.id}`}>Fill Color</Label>
                            <Input
                              id={`region-color-${region.id}`}
                              type="color"
                              value={region.color ?? '#fde68a'}
                              onChange={(event) => updateShadedRegion(index, { color: event.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`region-label-${region.id}`}>Label</Label>
                            <Input
                              id={`region-label-${region.id}`}
                              value={region.label ?? ''}
                              onChange={(event) => updateShadedRegion(index, { label: event.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`region-opacity-${region.id}`}>Opacity</Label>
                            <Input
                              id={`region-opacity-${region.id}`}
                              type="number"
                              min={0}
                              max={1}
                              step={0.05}
                              value={region.opacity ?? 0.25}
                              onChange={(event) => updateShadedRegion(index, { opacity: Number(event.target.value) })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Callouts &amp; Notes</h3>
                    <Button size="sm" onClick={addAnnotation}>
                      <Plus className="h-4 w-4 mr-1" /> Add annotation
                    </Button>
                  </div>

                  {annotations.length === 0 && (
                    <p className="text-sm text-muted-foreground">No annotations configured.</p>
                  )}

                  <div className="space-y-4">
                    {annotations.map((annotation, index) => (
                      <div key={annotation.id} className="border border-border rounded-md p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Annotation {index + 1}</h4>
                          <Button variant="ghost" size="icon" onClick={() => removeAnnotation(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor={`annotation-x-${annotation.id}`}>X position</Label>
                            <Input
                              id={`annotation-x-${annotation.id}`}
                              type="number"
                              value={annotation.x}
                              onChange={(event) => updateAnnotation(index, { x: Number(event.target.value) })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`annotation-y-${annotation.id}`}>Y position</Label>
                            <Input
                              id={`annotation-y-${annotation.id}`}
                              type="number"
                              value={annotation.y}
                              onChange={(event) => updateAnnotation(index, { y: Number(event.target.value) })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`annotation-color-${annotation.id}`}>Text Color</Label>
                            <Input
                              id={`annotation-color-${annotation.id}`}
                              type="color"
                              value={annotation.color ?? '#111827'}
                              onChange={(event) => updateAnnotation(index, { color: event.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`annotation-text-${annotation.id}`}>Annotation text</Label>
                          <Textarea
                            id={`annotation-text-${annotation.id}`}
                            value={annotation.text}
                            onChange={(event) => updateAnnotation(index, { text: event.target.value })}
                            rows={2}
                          />
                        </div>

                        <div className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                          <Label>Position</Label>
                          <Button
                            variant={pickingAnnotationIndex === index ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setPickingAnnotationIndex(index)}
                          >
                            <Crosshair className="h-4 w-4 mr-2" />
                            {pickingAnnotationIndex === index ? 'Click on Chart...' : 'Pick on Chart'}
                          </Button>
                        </div>

                        <div className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                          <Label htmlFor={`annotation-arrow-${annotation.id}`}>Show Arrow</Label>
                          <Switch
                            id={`annotation-arrow-${annotation.id}`}
                            checked={annotation.showArrow ?? false}
                            onCheckedChange={(checked) => updateAnnotation(index, {
                              showArrow: checked,
                              ax: checked ? (annotation.ax ?? 0) : undefined,
                              ay: checked ? (annotation.ay ?? -40) : undefined
                            })}
                          />
                        </div>

                        {annotation.showArrow && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`annotation-ax-${annotation.id}`}>Arrow X Offset</Label>
                              <Input
                                id={`annotation-ax-${annotation.id}`}
                                type="number"
                                value={annotation.ax ?? 0}
                                onChange={(event) => updateAnnotation(index, { ax: Number(event.target.value) })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`annotation-ay-${annotation.id}`}>Arrow Y Offset</Label>
                              <Input
                                id={`annotation-ay-${annotation.id}`}
                                type="number"
                                value={annotation.ay ?? -40}
                                onChange={(event) => updateAnnotation(index, { ay: Number(event.target.value) })}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="typography" className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="typography-preset">Journal preset</Label>
              <Select value={typographyPreset} onValueChange={(value: TypographyPreset) => setTypographyPreset(value)}>
                <SelectTrigger id="typography-preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="nejm">NEJM</SelectItem>
                  <SelectItem value="nature">Nature</SelectItem>
                  <SelectItem value="jama">JAMA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border border-dashed border-border rounded-md p-4 space-y-2" style={{ fontFamily: currentTypography.titleFontFamily }}>
              <p className="text-sm text-muted-foreground">Preview</p>
              <h3 style={{ fontSize: currentTypography.titleFontSize, fontWeight: 600 }}>Figure title</h3>
              <p style={{ fontSize: currentTypography.keyMessageFontSize, fontFamily: currentTypography.keyMessageFontFamily }}>Key message text</p>
              <p
                style={{
                  fontSize: currentTypography.captionFontSize,
                  fontFamily: currentTypography.captionFontFamily,
                  fontStyle: currentTypography.captionItalic ? 'italic' : 'normal',
                }}
              >
                Caption text example
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="figure-number">Figure number</Label>
                <Input
                  id="figure-number"
                  placeholder="e.g., Figure 2"
                  value={figureNumber}
                  onChange={(event) => setFigureNumber(event.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="caption-text">Caption</Label>
                <Textarea
                  id="caption-text"
                  placeholder="Concise explanation of the figure..."
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="caption-source">Source / footnote</Label>
              <Textarea
                id="caption-source"
                placeholder="Source notes, abbreviations, disclaimers..."
                value={captionSource}
                onChange={(event) => setCaptionSource(event.target.value)}
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="palette" className="mt-6">
            <ColorPaletteSelector selected={palette} onChange={setPalette} />
          </TabsContent>

          <TabsContent value="data" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {chartData.length} data points loaded
              </p>
            </div>

            {chartData.length > 0 ? (
              <div className="border border-border rounded-md overflow-hidden">
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {Object.keys(chartData[0]).map(key => (
                          <th key={key} className="px-3 py-2 text-left font-medium border-b border-border">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row: any, rowIndex: number) => (
                        <tr key={rowIndex} className="border-b border-border hover-elevate">
                          {Object.keys(chartData[0]).map(key => (
                            <td key={key} className="px-3 py-2">
                              <Input
                                value={row[key] ?? ''}
                                onChange={(e) => {
                                  const newData = [...chartData];
                                  const value = e.target.value;
                                  newData[rowIndex][key] = isNaN(Number(value)) ? value : Number(value);
                                  setChartData(newData);
                                }}
                                className="h-8 text-sm"
                                data-testid={`input-data-${rowIndex}-${key}`}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="border border-border rounded-md p-8 text-center bg-muted/30">
                <p className="text-sm text-muted-foreground">No data available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel-settings">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={!!validationError}
            data-testid="button-save-settings"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
