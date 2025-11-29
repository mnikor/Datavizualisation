import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type {
    AxisConfig,
    GridlineConfig,
    ReferenceLineConfig,
    ShadedRegionConfig,
    AnnotationConfig,
    SeriesOverrideConfig,
} from '@shared/schema';
import type { TypographyPresetStyles } from '@/lib/typographyPresets';
import { Layout, Data, Shape, Annotations } from 'plotly.js';

interface WaterfallDataPoint {
    patient: string;
    change: number;
    response?: 'CR' | 'PR' | 'SD' | 'PD'; // Complete Response, Partial Response, Stable Disease, Progressive Disease
}

interface WaterfallPlotProps {
    data: WaterfallDataPoint[];
    colors: readonly string[];
    showLabels: boolean;
    showLegend: boolean;
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

const parseTypographySize = (value?: string, fallback: string = '12px') => {
    if (!value) return parseInt(fallback);
    return parseInt(value.replace('px', ''));
};

export default function WaterfallPlot({
    data,
    colors,
    showLabels,
    showLegend,
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
}: WaterfallPlotProps) {
    const defaultTypography: TypographyPresetStyles = typography || {
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

    const resolvedGrid = resolveGridlines(gridLines);

    const seriesOverride = seriesOverrides?.change;

    // Handle empty dataset
    if (data.length === 0) {
        return (
            <div style={{ backgroundColor: bgColor, padding: '20px' }} data-testid="chart-waterfall">
                <p
                    style={{
                        textAlign: 'center',
                        color: 'hsl(var(--muted-foreground))',
                        fontFamily: defaultTypography.tickFontFamily,
                        fontSize: defaultTypography.tickFontSize,
                    }}
                >
                    No data available
                </p>
            </div>
        );
    }

    // Sort data by change (descending - biggest reduction first)
    const sortedData = [...data].sort((a, b) => a.change - b.change);

    // Color based on response thresholds
    const getColor = (change: number, response?: string) => {
        const overrideColor = seriesOverride?.color;
        if (overrideColor) return overrideColor;
        if (response === 'CR') return '#10b981'; // Green for complete response
        if (response === 'PR' || change <= -30) return '#3b82f6'; // Blue for partial response
        if (response === 'PD' || change >= 20) return '#ef4444'; // Red for progressive disease
        return colors[2] || '#6b7280'; // Gray for stable disease
    };

    const shapes: any[] = [
        // PR Reference Line
        {
            type: 'line',
            x0: 0,
            x1: 1,
            y0: -30,
            y1: -30,
            xref: 'paper',
            yref: 'y',
            line: { color: '#3b82f6', width: 2, dash: 'dash' }
        },
        // PD Reference Line
        {
            type: 'line',
            x0: 0,
            x1: 1,
            y0: 20,
            y1: 20,
            xref: 'paper',
            yref: 'y',
            line: { color: '#ef4444', width: 2, dash: 'dash' }
        },
        // Zero Line
        {
            type: 'line',
            x0: 0,
            x1: 1,
            y0: 0,
            y1: 0,
            xref: 'paper',
            yref: 'y',
            line: { color: 'hsl(var(--foreground))', width: seriesOverride?.strokeWidth ?? 1 }
        },
        ...(referenceLines?.map(line => ({
            type: 'line',
            x0: line.axis === 'x' ? line.value : 0,
            x1: line.axis === 'x' ? line.value : 1,
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

    const plotlyAnnotations: Partial<Annotations>[] = [
        {
            x: 1,
            y: -30,
            xref: 'paper',
            yref: 'y',
            text: 'PR (-30%)',
            showarrow: false,
            xanchor: 'right',
            yanchor: 'bottom',
            font: {
                family: defaultTypography.legendFontFamily,
                size: parseTypographySize(defaultTypography.legendFontSize, '12px'),
            }
        },
        {
            x: 1,
            y: 20,
            xref: 'paper',
            yref: 'y',
            text: 'PD (+20%)',
            showarrow: false,
            xanchor: 'right',
            yanchor: 'bottom',
            font: {
                family: defaultTypography.legendFontFamily,
                size: parseTypographySize(defaultTypography.legendFontSize, '12px'),
            }
        },
        ...(annotations?.map(note => ({
            x: note.x,
            y: note.y,
            text: note.text,
            showarrow: true,
            arrowhead: 2,
            ax: 0,
            ay: -30,
            font: {
                family: defaultTypography.tickFontFamily,
                size: parseTypographySize(defaultTypography.tickFontSize, '12px'),
                color: note.color || '#111827'
            }
        })) || [])
    ];

    const traces: Data[] = [
        {
            x: sortedData.map(d => d.patient),
            y: sortedData.map(d => d.change),
            type: 'bar',
            marker: {
                color: sortedData.map(d => getColor(d.change, d.response))
            },
            name: 'Change from Baseline',
            text: sortedData.map(d => `${d.change > 0 ? '+' : ''}${d.change}%`),
            hoverinfo: 'x+text'
        }
    ];

    const layout: Partial<Layout> = {
        paper_bgcolor: bgColor,
        plot_bgcolor: bgColor,
        font: {
            family: defaultTypography.tickFontFamily,
            size: parseTypographySize(defaultTypography.tickFontSize, '12px'),
            color: '#000000',
        },
        showlegend: showLegend,
        legend: {
            font: {
                family: defaultTypography.legendFontFamily,
                size: parseTypographySize(defaultTypography.legendFontSize, '12px'),
            },
            orientation: 'h',
            yanchor: 'bottom',
            y: 1.02,
            xanchor: 'right',
            x: 1
        },
        margin: { t: 40, r: 20, b: 40, l: 60 },
        xaxis: {
            title: {
                text: xAxisLabel || (showLabels ? 'Patients' : undefined),
                font: {
                    family: defaultTypography.axisLabelFontFamily,
                    size: parseTypographySize(defaultTypography.axisLabelFontSize, '12px'),
                }
            },
            showgrid: resolvedGrid.showX,
            gridcolor: '#e5e7eb',
            tickangle: -45,
        },
        yaxis: {
            title: {
                text: yAxisLabel || (showLabels ? 'Change from Baseline (%)' : undefined),
                font: {
                    family: defaultTypography.axisLabelFontFamily,
                    size: parseTypographySize(defaultTypography.axisLabelFontSize, '12px'),
                }
            },
            showgrid: resolvedGrid.showY,
            gridcolor: '#e5e7eb',
            range: [axis?.y?.min ?? undefined, axis?.y?.max ?? undefined] as any,
        },
        shapes: shapes,
        annotations: plotlyAnnotations,
    };

    return (
        <div style={{ backgroundColor: bgColor }} data-testid="chart-waterfall">
            <Plot
                data={traces}
                layout={layout}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
            />
        </div>
    );
}
