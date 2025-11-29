import { useMemo, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data as PlotlyData, Layout as PlotlyLayout, Config as PlotlyConfig } from 'plotly.js';
import type {
    AxisConfig,
    GridlineConfig,
    ReferenceLineConfig,
    ShadedRegionConfig,
    AnnotationConfig,
    SeriesOverrideConfig,
} from '@shared/schema';
import type { TypographyPresetStyles } from '@/lib/typographyPresets';

type KaplanRow = Record<string, unknown>;

type KaplanSeries = {
    group: string;
    steps: { time: number; survival: number; atRisk?: number }[];
    censored: { time: number; survival: number }[];
    // Map time to atRisk count for quick lookup
    atRiskMap: Map<number, number>;
};

type ColumnMapping = {
    time: string;
    group?: string;
    event?: string;
    censored?: string;
    survival?: string;
};

interface LLMColumnInference {
    mapping: ColumnMapping | null;
    confidence: number;
    reasoning?: string;
}

interface KaplanMeierPlotProps {
    data: KaplanRow[];
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
    onColumnMappingResolved?: (mapping: ColumnMapping, confidence: number, usedLLM: boolean) => void;
}

const parseNumber = (raw: unknown): number | undefined => {
    if (raw === null || raw === undefined) return undefined;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
        const parsed = Number(raw.trim().replace(/[^0-9eE.+-]/g, ''));
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
};

const parseBoolean = (raw: unknown): boolean | undefined => {
    if (raw === null || raw === undefined) return undefined;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw > 0 : undefined;
    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase();
        if (!normalized) return undefined;
        if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
        if (['false', 'no', 'n', '0'].includes(normalized)) return false;
    }
    return undefined;
};

const prettifyLabel = (value: string) =>
    value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim() || 'Series';

const TIME_PATTERNS = [/time/i, /month/i, /week/i, /day/i, /follow/i];
const GROUP_PATTERNS = [/group/i, /arm/i, /cohort/i, /treatment/i, /variant/i, /strata/i];
const EVENT_PATTERNS = [/event/i, /status/i, /outcome/i, /dead/i, /death/i, /failure/i, /recurrence/i];
const SURVIVAL_PATTERNS = [/survival/i, /surv/i, /prob/i, /pct/i, /percent/i];
const CENSOR_PATTERNS = [/censor/i];

const findByPatterns = (keys: string[], patterns: RegExp[]) => {
    for (const key of keys) {
        const trimmed = key.trim();
        const normalized = trimmed.replace(/[_\-]+/g, ' ');
        const collapsed = normalized.replace(/\s+/g, '');

        if (
            patterns.some((pattern) =>
                pattern.test(key) || pattern.test(normalized) || pattern.test(collapsed)
            )
        ) {
            return key;
        }
    }
    return undefined;
};

const collectKeys = (rows: KaplanRow[]): string[] => {
    const set = new Set<string>();
    rows.forEach((row) => {
        if (row && typeof row === 'object') {
            Object.keys(row).forEach((key) => set.add(key));
        }
    });
    return Array.from(set);
};

const inferGroupColumn = (
    rows: KaplanRow[],
    keys: string[],
    reservedKeys: Set<string>
): string | undefined => {
    // First try known group patterns.
    const explicit = findByPatterns(keys, GROUP_PATTERNS);
    if (explicit && !reservedKeys.has(explicit)) return explicit;

    const SAMPLE_LIMIT = 50;
    const samples = rows.slice(0, SAMPLE_LIMIT);

    let bestCandidate: { key: string; score: number } | undefined;

    keys.forEach((key) => {
        if (reservedKeys.has(key)) return;

        const values = new Set<string>();
        let stringCount = 0;
        let numericCount = 0;

        samples.forEach((row) => {
            const raw = getValue(row, key);
            if (raw === null || raw === undefined) return;
            const stringValue = String(raw).trim();
            if (!stringValue) return;
            values.add(stringValue);

            if (parseNumber(raw) !== undefined) {
                numericCount += 1;
            } else {
                stringCount += 1;
            }
        });

        if (values.size < 2 || values.size > 20) return;

        // Prefer columns with more strings than numeric interpretations (categorical).
        // OR numeric columns with low cardinality (likely categorical codes like 1, 2, 3)
        const isLowCardinality = values.size <= 10;
        const categoricalScore = stringCount - numericCount;

        if (categoricalScore <= 0 && !isLowCardinality) return;

        const diversityScore = Math.min(values.size, 10);
        const totalScore = categoricalScore + diversityScore;

        if (!bestCandidate || totalScore > bestCandidate.score) {
            bestCandidate = { key, score: totalScore };
        }
    });

    return bestCandidate?.key;
};

const getValue = (row: KaplanRow, key?: string): unknown => {
    if (!row || typeof row !== 'object' || !key) return undefined;

    if (key in row) return (row as Record<string, unknown>)[key];

    const trimmed = key.trim();
    if (trimmed && trimmed in row) return (row as Record<string, unknown>)[trimmed];

    const collapsed = trimmed.replace(/\s+/g, '');
    if (collapsed && collapsed in row) return (row as Record<string, unknown>)[collapsed];

    const underscored = trimmed.replace(/\s+/g, '_');
    if (underscored && underscored in row) return (row as Record<string, unknown>)[underscored];

    const normalizedTarget = trimmed.replace(/[\s_]+/g, '').toLowerCase();
    if (!normalizedTarget) return undefined;

    for (const candidate of Object.keys(row)) {
        const normalizedCandidate = candidate.replace(/[\s_]+/g, '').toLowerCase();
        if (normalizedCandidate === normalizedTarget) {
            return (row as Record<string, unknown>)[candidate];
        }
    }

    return undefined;
};

const ensurePercent = (value: number) => (value <= 1 ? value * 100 : value);

const buildEventSeries = (rows: KaplanRow[], mapping: ColumnMapping): KaplanSeries[] => {
    const timeKey = mapping.time;
    const groupKey = mapping.group;
    const eventKey = mapping.event;
    const censorKey = mapping.censored;

    const grouped = new Map<string, Map<number, { events: number; censored: number }>>();

    rows.forEach((row) => {
        if (!row || typeof row !== 'object') return;
        const time = parseNumber(getValue(row, timeKey));
        if (time === undefined) return;

        const rawGroup = groupKey ? getValue(row, groupKey) : undefined;
        const group = rawGroup !== undefined && rawGroup !== null ? String(rawGroup) : 'Group';

        const eventRaw = eventKey ? getValue(row, eventKey) : undefined;
        let isEvent = true; // Default to event if we can't determine

        if (eventRaw !== undefined && eventRaw !== null) {
            const s = String(eventRaw).trim().toLowerCase();
            const n = parseNumber(eventRaw);

            if (n !== undefined) {
                // Numeric: 1 = event, 0 = censored
                isEvent = n > 0;
            } else if (s === 'true' || s === 'yes' || s === 'y' || s === 'event' || s === 'dead' || s === 'death' || s === 'failed' || s === 'failure' || s === '1') {
                isEvent = true;
            } else if (s === 'false' || s === 'no' || s === 'n' || s === 'censored' || s === 'censor' || s === 'alive' || s === 'survived' || s === '0') {
                isEvent = false;
            }
        }

        const censored =
            parseBoolean(
                censorKey
                    ? getValue(row, censorKey)
                    : getValue(row, 'censored') ?? getValue(row, 'censor') ?? getValue(row, 'Censored') ?? getValue(row, 'Censor')
            ) ?? !isEvent;

        if (!grouped.has(group)) grouped.set(group, new Map());
        const timeline = grouped.get(group)!;
        const bucket = timeline.get(time) ?? { events: 0, censored: 0 };

        if (isEvent && !censored) {
            bucket.events += 1;
        } else {
            bucket.censored += 1;
        }

        timeline.set(time, bucket);
    });

    const result: KaplanSeries[] = [];

    grouped.forEach((timeline, group) => {
        const orderedTimes = Array.from(timeline.keys()).sort((a, b) => a - b);
        const total = Array.from(timeline.values()).reduce(
            (sum, bucket) => sum + bucket.events + bucket.censored,
            0
        );

        let atRisk = total;
        let survival = 100;
        const steps: KaplanSeries['steps'] = [{ time: 0, survival, atRisk }];
        const censoredPoints: KaplanSeries['censored'] = [];
        const atRiskMap = new Map<number, number>();

        // Initial at risk
        atRiskMap.set(0, total);

        orderedTimes.forEach((time) => {
            // Record at risk before events/censoring at this time
            atRiskMap.set(time, atRisk);

            if (atRisk <= 0) return;
            const bucket = timeline.get(time)!;

            // Update survival
            if (bucket.events > 0) {
                survival *= (atRisk - bucket.events) / atRisk;
            }

            steps.push({ time, survival, atRisk });

            for (let i = 0; i < bucket.censored; i += 1) {
                censoredPoints.push({ time, survival });
            }

            atRisk -= bucket.events + bucket.censored;
        });

        result.push({ group, steps, censored: censoredPoints, atRiskMap });
    });

    return result;
};

const buildSurvivalSeries = (rows: KaplanRow[], mapping: ColumnMapping): KaplanSeries[] => {
    const timeKey = mapping.time;
    const groupKey = mapping.group;
    const survivalKey = mapping.survival;
    const censorKey = mapping.censored;

    if (!survivalKey) return [];

    const grouped = new Map<string, KaplanSeries>();

    rows.forEach((row) => {
        if (!row || typeof row !== 'object') return;
        const time = parseNumber(getValue(row, timeKey));
        const survival = parseNumber(getValue(row, survivalKey));
        if (time === undefined || survival === undefined) return;

        const rawGroup = groupKey ? getValue(row, groupKey) : undefined;
        const group = rawGroup !== undefined && rawGroup !== null ? String(rawGroup) : prettifyLabel(survivalKey);
        const percent = ensurePercent(survival);
        const censored =
            parseBoolean(censorKey ? getValue(row, censorKey) : getValue(row, 'censored')) ?? false;

        if (!grouped.has(group)) {
            grouped.set(group, { group, steps: [{ time: 0, survival: 100 }], censored: [], atRiskMap: new Map() });
        }
        const series = grouped.get(group)!;
        series.steps.push({ time, survival: percent });
        if (censored) {
            series.censored.push({ time, survival: percent });
        }
    });

    grouped.forEach((series) => {
        series.steps.sort((a, b) => a.time - b.time);
        if (series.steps.length === 0 || series.steps[0].time !== 0) {
            series.steps.unshift({ time: 0, survival: 100 });
        } else {
            series.steps[0].survival = 100;
        }
        series.censored.sort((a, b) => a.time - b.time);
    });

    return Array.from(grouped.values());
};

const resolveGridlines = (config?: GridlineConfig) => ({
    showX: config?.showX ?? true,
    showY: config?.showY ?? true,
    dashed: config?.dashed ?? false,
});

const parseFontSize = (raw: string | number | undefined, fallback: number): number => {
    if (raw === undefined) return fallback;
    if (typeof raw === 'number') return raw;
    const match = raw.trim().match(/([0-9]*\.?[0-9]+)/);
    if (!match) return fallback;
    const value = Number(match[1]);
    if (Number.isNaN(value)) return fallback;
    if (raw.includes('rem')) {
        return value * 16;
    }
    return value;
};

const defaultTypography: TypographyPresetStyles = {
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

const resolveLabel = (preferred?: string, provided?: string, fallback?: string) => {
    if (preferred && preferred.trim()) return preferred;
    if (provided && provided.trim()) return provided;
    return fallback;
};

const deriveMappingHeuristically = (rows: KaplanRow[]): { mapping: ColumnMapping | null; confidence: number } => {
    if (!Array.isArray(rows) || rows.length === 0) {
        return { mapping: null, confidence: 0 };
    }

    const keys = collectKeys(rows);

    // Explicit check for standardized keys from deterministic extraction
    if (keys.includes('time') && keys.includes('status') && keys.includes('group')) {
        return {
            mapping: { time: 'time', event: 'status', group: 'group' },
            confidence: 1
        };
    }

    const timeKey = findByPatterns(keys, TIME_PATTERNS) ?? keys.find((key) => /month|week|day/i.test(key));

    if (!timeKey) {
        return { mapping: null, confidence: 0 };
    }

    const reserved = new Set<string>([timeKey]);
    const eventCandidate = findByPatterns(keys, EVENT_PATTERNS);
    const survivalCandidate = findByPatterns(keys, SURVIVAL_PATTERNS);
    if (eventCandidate) reserved.add(eventCandidate);
    if (survivalCandidate) reserved.add(survivalCandidate);

    const groupKey = inferGroupColumn(rows, keys, reserved);
    const censorKey = findByPatterns(keys, CENSOR_PATTERNS);

    const mapping: ColumnMapping = { time: timeKey };

    if (groupKey) mapping.group = groupKey;
    if (censorKey) mapping.censored = censorKey;

    if (eventCandidate) {
        mapping.event = eventCandidate;
        const confidence = groupKey ? 0.8 : 0.6;
        return { mapping, confidence };
    }

    if (survivalCandidate) {
        mapping.survival = survivalCandidate;
        if (!groupKey) {
            mapping.group = prettifyLabel(survivalCandidate);
        }
        const confidence = groupKey ? 0.7 : 0.5;
        return { mapping, confidence };
    }

    return { mapping: null, confidence: 0 };
};

const fetchLLMMapping = async (rows: KaplanRow[]): Promise<LLMColumnInference | null> => {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    try {
        const response = await fetch('/api/kaplan/infer-columns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                rows: rows.slice(0, 25),
            }),
        });

        if (!response.ok) {
            console.error('LLM inference failed with status', response.status);
            return null;
        }

        const payload = (await response.json()) as LLMColumnInference;
        if (!payload || !payload.mapping) {
            return null;
        }

        return payload;
    } catch (error) {
        console.error('LLM inference error:', error);
        return null;
    }
};

const buildSeries = (
    rows: KaplanRow[],
    mapping: ColumnMapping
): KaplanSeries[] => {
    if (!mapping.time) return [];

    if (mapping.event) {
        return buildEventSeries(rows, mapping);
    }

    if (mapping.survival) {
        return buildSurvivalSeries(rows, mapping);
    }

    return buildEventSeries(rows, mapping);
};

// Helper to find the closest previous at-risk value
const getAtRiskAtTime = (series: KaplanSeries, time: number): number | string => {
    if (!series.atRiskMap || series.atRiskMap.size === 0) return '-';

    // Exact match
    if (series.atRiskMap.has(time)) return series.atRiskMap.get(time)!;

    // Find closest time before or equal to 'time'
    let closestTime = -1;
    for (const t of Array.from(series.atRiskMap.keys())) {
        if (t <= time && t > closestTime) {
            closestTime = t;
        }
    }

    if (closestTime !== -1) return series.atRiskMap.get(closestTime)!;

    // If time is before any recorded time (shouldn't happen with 0 init), return initial
    return series.steps[0]?.atRisk ?? '-';
};

export default function KaplanMeierPlot({
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
    onColumnMappingResolved,
}: KaplanMeierPlotProps) {
    const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
    const [mappingConfidence, setMappingConfidence] = useState<number>(0);
    const [llmAttempted, setLlmAttempted] = useState<boolean>(false);

    const heuristicMapping = useMemo(() => deriveMappingHeuristically(data), [data]);

    useEffect(() => {
        let cancelled = false;

        const resolveMapping = async () => {
            if (heuristicMapping.mapping && heuristicMapping.confidence >= 0.75) {
                setColumnMapping(heuristicMapping.mapping);
                setMappingConfidence(heuristicMapping.confidence);
                onColumnMappingResolved?.(heuristicMapping.mapping, heuristicMapping.confidence, false);
                return;
            }

            const llmResult = await fetchLLMMapping(data);
            if (cancelled) return;

            if (llmResult?.mapping) {
                setColumnMapping(llmResult.mapping);
                setMappingConfidence(llmResult.confidence ?? heuristicMapping.confidence ?? 0.5);
                setLlmAttempted(true);
                onColumnMappingResolved?.(
                    llmResult.mapping,
                    llmResult.confidence ?? heuristicMapping.confidence ?? 0.5,
                    true
                );
                return;
            }

            if (heuristicMapping.mapping) {
                setColumnMapping(heuristicMapping.mapping);
                setMappingConfidence(heuristicMapping.confidence ?? 0.5);
                onColumnMappingResolved?.(
                    heuristicMapping.mapping,
                    heuristicMapping.confidence ?? 0.5,
                    false
                );
                return;
            }

            setColumnMapping(null);
            setMappingConfidence(0);
        };

        resolveMapping();

        return () => {
            cancelled = true;
        };
    }, [data, heuristicMapping.mapping, heuristicMapping.confidence, onColumnMappingResolved]);

    const resolvedGrid = resolveGridlines(gridLines);
    const typographyTheme = typography ?? defaultTypography;

    const seriesList = useMemo(() => {
        if (!columnMapping) return [];
        return buildSeries(data, columnMapping);
    }, [data, columnMapping]);

    if (!columnMapping) {
        return (
            <div style={{ backgroundColor: bgColor, padding: '20px' }} data-testid="chart-kaplan-meier">
                <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                    Unable to identify required columns for Kaplan–Meier calculation.
                </p>
            </div>
        );
    }

    if (seriesList.length === 0) {
        return (
            <div style={{ backgroundColor: bgColor, padding: '20px' }} data-testid="chart-kaplan-meier">
                <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>No data available</p>
            </div>
        );
    }

    const overrides = seriesOverrides ?? {};
    const plotData: PlotlyData[] = [];

    // Determine time range and ticks for risk table
    const allTimes = seriesList.flatMap((series) => series.steps.map((point) => point.time));
    const minTime = Math.min(...allTimes);
    const maxTime = Math.max(...allTimes);

    // Generate ticks for x-axis and risk table
    const timeRange = maxTime - minTime;
    // Aim for about 5-10 ticks
    let tickInterval = 1;
    if (timeRange > 100) tickInterval = 20;
    else if (timeRange > 50) tickInterval = 10;
    else if (timeRange > 20) tickInterval = 5;
    else if (timeRange > 10) tickInterval = 2;

    const tickVals: number[] = [];
    for (let t = 0; t <= Math.ceil(maxTime); t += tickInterval) {
        if (t >= minTime) tickVals.push(t);
    }

    // 1. Survival Curves (Top Subplot)
    seriesList.forEach((series, index) => {
        const key = series.group.replace(/[^a-zA-Z0-9]+/g, '_');
        const override = overrides[series.group] ?? overrides[key];
        const color = override?.color ?? colors[index % colors.length];
        const strokeWidth = override?.strokeWidth ?? 2;

        const steps = [...series.steps].sort((a, b) => a.time - b.time);
        if (steps.length === 0 || steps[0].time !== 0) {
            steps.unshift({ time: 0, survival: 100 });
        } else {
            steps[0].survival = 100;
        }

        plotData.push({
            type: 'scatter',
            mode: 'lines',
            name: series.group,
            x: steps.map((point) => point.time),
            y: steps.map((point) => point.survival),
            line: {
                color,
                width: strokeWidth,
                shape: 'hv',
            },
            hovertemplate: `<b>${series.group}</b><br>Time: %{x}<br>Survival: %{y:.1f}%<extra></extra>`,
            xaxis: 'x',
            yaxis: 'y',
            legendgroup: series.group,
        });

        if (series.censored.length > 0) {
            plotData.push({
                type: 'scatter',
                mode: 'markers',
                name: `${series.group} (censored)`,
                x: series.censored.map((point) => point.time),
                y: series.censored.map((point) => point.survival),
                marker: {
                    symbol: 'line-ns-open',
                    color,
                    size: 10,
                },
                showlegend: false,
                hovertemplate: `<b>${series.group} (censored)</b><br>Time: %{x}<br>Survival: %{y:.1f}%<extra></extra>`,
                xaxis: 'x',
                yaxis: 'y',
                legendgroup: series.group,
            });
        }
    });

    // 2. Number at Risk Table (Bottom Subplot)
    // We use scatter traces with mode 'text' to place numbers
    seriesList.forEach((series, index) => {
        const key = series.group.replace(/[^a-zA-Z0-9]+/g, '_');
        const override = overrides[series.group] ?? overrides[key];
        const color = override?.color ?? colors[index % colors.length];

        const riskCounts = tickVals.map(t => getAtRiskAtTime(series, t));

        plotData.push({
            type: 'scatter',
            mode: 'text',
            x: tickVals,
            y: Array(tickVals.length).fill(seriesList.length - 1 - index), // Stack vertically
            text: riskCounts.map(String),
            textfont: {
                color: color,
                family: typographyTheme.tickFontFamily,
                size: parseFontSize(typographyTheme.tickFontSize, 12),
            },
            showlegend: false,
            hoverinfo: 'skip',
            xaxis: 'x',
            yaxis: 'y2',
            legendgroup: series.group,
        });

        // Add label for the row on the left (using negative x or annotation? Plotly doesn't support outside labels easily in subplots)
        // We'll use the y-axis title or tick labels for the series names if possible, but y-axis ticks are numeric.
        // Let's use annotations for row labels.
    });

    const yMin = axis?.y?.min ?? 0;
    const yMax = axis?.y?.max ?? 100;

    const shapes: NonNullable<PlotlyLayout['shapes']> = [];
    const annotationLayout: NonNullable<PlotlyLayout['annotations']> = [];

    referenceLines?.forEach((reference) => {
        const color = reference.color || '#6b7280';
        if (reference.axis === 'x') {
            shapes.push({
                type: 'line',
                xref: 'x',
                yref: 'y',
                x0: reference.value,
                x1: reference.value,
                y0: yMin,
                y1: yMax,
                line: {
                    color,
                    width: 1.5,
                    dash: reference.dashed ? 'dash' : 'solid',
                },
            });
        } else {
            shapes.push({
                type: 'line',
                xref: 'x',
                yref: 'y',
                x0: minTime,
                x1: maxTime,
                y0: reference.value,
                y1: reference.value,
                line: {
                    color,
                    width: 1.5,
                    dash: reference.dashed ? 'dash' : 'solid',
                },
            });
        }

        if (reference.label) {
            annotationLayout.push({
                xref: 'x',
                yref: 'y',
                x: reference.axis === 'x' ? reference.value : maxTime,
                y: reference.axis === 'x' ? yMax : reference.value,
                text: reference.label,
                showarrow: false,
                font: {
                    family: typographyTheme.legendFontFamily,
                    size: parseFontSize(typographyTheme.legendFontSize, 12),
                    color,
                },
                xanchor: reference.axis === 'x' ? 'left' : 'right',
                yanchor: 'bottom',
            });
        }
    });

    // Add series names as annotations for the risk table
    seriesList.forEach((series, index) => {
        const key = series.group.replace(/[^a-zA-Z0-9]+/g, '_');
        const override = overrides[series.group] ?? overrides[key];
        const color = override?.color ?? colors[index % colors.length];

        annotationLayout.push({
            xref: 'paper',
            yref: 'y2',
            x: 0, // Left aligned
            xanchor: 'right',
            y: seriesList.length - 1 - index,
            text: series.group,
            showarrow: false,
            font: {
                color: color,
                family: typographyTheme.tickFontFamily,
                size: parseFontSize(typographyTheme.tickFontSize, 12),
            },
            xshift: -10,
        });
    });

    const xAxisTitle = resolveLabel(axis?.x?.label, xAxisLabel, 'Time (months)');
    const yAxisTitle = resolveLabel(axis?.y?.label, yAxisLabel, 'Survival Probability (%)');

    // Adjust height to accommodate table
    const tableHeight = Math.max(50, seriesList.length * 20);
    const chartHeight = (showLabels && showLegend ? 380 : showLabels || showLegend ? 340 : 300) + tableHeight;

    const layout: Partial<PlotlyLayout> = {
        margin: { t: 20, r: 20, l: 120, b: 50 }, // Increased left margin for table labels
        autosize: true,
        showlegend: showLegend,
        legend: showLegend
            ? {
                orientation: 'h',
                x: 0,
                y: 1.1, // Move legend to top
                font: {
                    family: typographyTheme.legendFontFamily,
                    size: parseFontSize(typographyTheme.legendFontSize, 12),
                    color: '#111827',
                },
            }
            : undefined,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
            family: typographyTheme.tickFontFamily,
            size: parseFontSize(typographyTheme.tickFontSize, 12),
            color: '#111827',
        },
        hovermode: 'closest',
        xaxis: {
            title: showLabels ? xAxisTitle : undefined,
            showgrid: resolvedGrid.showY,
            gridcolor: 'rgba(148, 163, 184, 0.25)',
            gridwidth: resolvedGrid.showY ? 1 : 0,
            zeroline: false,
            range: [minTime, maxTime * 1.05], // Add some padding
            tickvals: tickVals,
            domain: [0, 1],
            anchor: 'y2' // Anchor to bottom axis? No, shared x axis
        },
        yaxis: {
            title: showLabels ? yAxisTitle : undefined,
            showgrid: resolvedGrid.showX,
            gridcolor: 'rgba(148, 163, 184, 0.25)',
            gridwidth: resolvedGrid.showX ? 1 : 0,
            zeroline: false,
            range: [yMin, yMax],
            ticksuffix: '%',
            domain: [0.3, 1], // Top 70%
        },
        // Second y-axis for the table
        yaxis2: {
            domain: [0, 0.2], // Bottom 20%
            showgrid: false,
            zeroline: false,
            showticklabels: false,
            range: [-0.5, seriesList.length - 0.5],
        },
        shapes,
        annotations: annotationLayout,
    };

    const config: Partial<PlotlyConfig> = {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
            format: 'svg',
            filename: 'kaplan-meier',
        },
    };

    return (
        <div style={{ backgroundColor: bgColor }} data-testid="chart-kaplan-meier">
            <div style={{ height: `${chartHeight}px` }}>
                <Plot data={plotData} layout={layout} config={config} style={{ width: '100%', height: '100%' }} useResizeHandler />
            </div>
        </div>
    );
}
