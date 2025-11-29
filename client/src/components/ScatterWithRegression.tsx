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

interface ScatterDataPoint {
    x: number;
    y: number;
    group?: string;
}

interface ScatterWithRegressionProps {
    data: ScatterDataPoint[];
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

function calculateRegression(data: ScatterDataPoint[]) {
    const n = data.length;
    const sumX = data.reduce((sum, point) => sum + point.x, 0);
    const sumY = data.reduce((sum, point) => sum + point.y, 0);
    const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);

    const denominator = n * sumXX - sumX * sumX;

    if (denominator === 0 || !Number.isFinite(denominator)) {
        const meanY = n === 0 ? 0 : sumY / (n || 1);
        return {
            slope: 0,
            intercept: meanY,
            rSquared: 0,
            r: 0,
        };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const meanY = n === 0 ? 0 : sumY / n;
    const ssTotal = data.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
    const ssResidual = data.reduce((sum, point) => {
        const predicted = slope * point.x + intercept;
        return sum + (point.y - predicted) ** 2;
    }, 0);
    const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;
    const r = Math.sqrt(Math.abs(rSquared)) * (slope >= 0 ? 1 : -1);

    return { slope, intercept, rSquared, r };
}

const parseTypographySize = (value?: string, fallback: string = '12px') => {
    if (!value) return parseInt(fallback);
    return parseInt(value.replace('px', ''));
};

export default function ScatterWithRegression({
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
}: ScatterWithRegressionProps) {
    const typographyTheme = typography ?? DEFAULT_TYPOGRAPHY;
    const resolvedGrid = resolveGridlines(gridLines);
    const xScaleType = axis?.x?.scale ?? 'linear';
    const yScaleType = axis?.y?.scale ?? 'linear';

    if (data.length === 0) {
        return (
            <div style={{ backgroundColor: bgColor, padding: '20px' }} data-testid="chart-scatter">
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

    const groups = Array.from(new Set(data.map((d) => d.group || 'All')));

    const filterValues = (values: number[], scale: 'linear' | 'log') =>
        values.filter((value) => Number.isFinite(value) && (scale === 'linear' || value > 0));

    const xValues = filterValues(data.map((d) => d.x), xScaleType);
    const yValues = filterValues(data.map((d) => d.y), yScaleType);

    const computeDomain = (
        values: number[],
        config: AxisConfig | undefined,
        scale: 'linear' | 'log',
    ): [number, number] => {
        if (values.length === 0) {
            return [config?.min ?? 0, config?.max ?? 1];
        }

        const fallbackMin = Math.min(...values);
        const fallbackMax = Math.max(...values);
        const scaledMin = scaleValue(fallbackMin, scale);
        const scaledMax = scaleValue(fallbackMax, scale);
        const axisMin = config?.min !== undefined ? scaleValue(config.min, scale) : undefined;
        const axisMax = config?.max !== undefined ? scaleValue(config.max, scale) : undefined;
        const baseMin = axisMin ?? scaledMin;
        const baseMax = axisMax ?? scaledMax;
        const padding = (baseMax - baseMin || 1) * 0.1;
        const domainMin = axisMin ?? baseMin - padding;
        const domainMax = axisMax ?? baseMax + padding;
        return [inverseScaleValue(domainMin, scale), inverseScaleValue(domainMax, scale)];
    };

    const [xDomainMin, xDomainMax] = computeDomain(xValues, axis?.x, xScaleType);
    const [yDomainMin, yDomainMax] = computeDomain(yValues, axis?.y, yScaleType);

    const { slope, intercept, rSquared, r } = calculateRegression(data);

    const regressionOverride = seriesOverrides?.regression;
    const regressionColor = regressionOverride?.color ?? colors[colors.length - 1] ?? colors[0];
    const regressionStroke = regressionOverride?.strokeWidth ?? 2;
    const showRegression = regressionOverride?.showTrendLine !== false;

    const regressionLine = showRegression
        ? [
            { x: xDomainMin, y: slope * xDomainMin + intercept },
            { x: xDomainMax, y: slope * xDomainMax + intercept },
        ]
        : [];

    const shapes: any[] = [
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
        ...(annotations?.map(note => ({
            x: note.x,
            y: note.y,
            text: note.text,
            showarrow: true,
            arrowhead: 2,
            ax: 0,
            ay: -30,
            font: {
                family: typographyTheme.tickFontFamily,
                size: parseTypographySize(typographyTheme.tickFontSize, '12px'),
                color: note.color || '#111827'
            }
        })) || [])
    ];

    const traces: Data[] = [
        ...groups.map((group, index) => {
            const groupData = data.filter((d) => (d.group || 'All') === group);
            const override = seriesOverrides?.[group];
            const color = override?.color ?? colors[index % colors.length];

            return {
                x: groupData.map(d => d.x),
                y: groupData.map(d => d.y),
                name: group,
                type: 'scatter' as const,
                mode: 'markers' as const,
                marker: { color: color, size: 8 }
            };
        }),
        ...(showRegression ? [{
            x: regressionLine.map(d => d.x),
            y: regressionLine.map(d => d.y),
            name: 'Regression',
            type: 'scatter' as const,
            mode: 'lines' as const,
            line: { color: regressionColor, width: regressionStroke },
            hoverinfo: 'none' as const
        }] : [])
    ];

    const layout: Partial<Layout> = {
        paper_bgcolor: bgColor,
        plot_bgcolor: bgColor,
        font: {
            family: typographyTheme.tickFontFamily,
            size: parseTypographySize(typographyTheme.tickFontSize, '12px'),
            color: '#000000',
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
        margin: { t: 40, r: 20, b: 40, l: 60 },
        xaxis: {
            title: {
                text: xAxisLabel || (showLabels ? 'X Variable' : undefined),
                font: {
                    family: typographyTheme.axisLabelFontFamily,
                    size: parseTypographySize(typographyTheme.axisLabelFontSize, '12px'),
                }
            },
            showgrid: resolvedGrid.showX,
            gridcolor: '#e5e7eb',
            type: xScaleType,
            range: [xDomainMin, xDomainMax],
        },
        yaxis: {
            title: {
                text: yAxisLabel || (showLabels ? 'Y Variable' : undefined),
                font: {
                    family: typographyTheme.axisLabelFontFamily,
                    size: parseTypographySize(typographyTheme.axisLabelFontSize, '12px'),
                }
            },
            showgrid: resolvedGrid.showY,
            gridcolor: '#e5e7eb',
            type: yScaleType,
            range: [yDomainMin, yDomainMax],
        },
        shapes: shapes,
        annotations: [
            ...plotlyAnnotations,
            ...(showLegend ? [{
                xref: 'paper',
                yref: 'paper',
                x: 0.5,
                y: 1.1,
                xanchor: 'center',
                yanchor: 'bottom',
                text: `y = ${slope.toFixed(3)}x + ${intercept.toFixed(3)} | R² = ${rSquared.toFixed(3)} | r = ${r.toFixed(3)}`,
                showarrow: false,
                font: {
                    family: typographyTheme.legendFontFamily,
                    size: parseTypographySize(typographyTheme.legendFontSize, '12px'),
                }
            }] as Partial<Annotations>[] : [])
        ]
    };

    return (
        <div style={{ backgroundColor: bgColor }} data-testid="chart-scatter">
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
