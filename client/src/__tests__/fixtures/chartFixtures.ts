import type { Chart } from '@shared/schema';

export const baseColors = ['#111827', '#2563eb', '#16a34a', '#f97316', '#db2777', '#7c3aed'] as const;

export const lineChartFixture = {
  id: 1,
  type: 'line',
  title: 'Response Over Time',
  keyMessage: 'Treatment shows sustained efficacy vs placebo.',
  showLabels: true,
  showLegend: true,
  palette: 'default',
  transparentBg: false,
  data: [
    { week: 0, treatment: 20, placebo: 20, treatmentLower: 18, treatmentUpper: 22 },
    { week: 4, treatment: 45, placebo: 28, treatmentLower: 42, treatmentUpper: 48 },
    { week: 8, treatment: 62, placebo: 33, treatmentLower: 58, treatmentUpper: 66 },
    { week: 12, treatment: 78, placebo: 35, treatmentLower: 74, treatmentUpper: 82 },
  ],
  hasData: true,
  dataIssue: undefined,
  axis: {
    x: { min: 0, max: 12, label: 'Week', scale: 'linear' },
    y: { min: 0, max: 100, label: 'Response (%)', scale: 'linear' },
  },
  gridLines: {
    showX: true,
    showY: true,
    dashed: true,
  },
  referenceLines: [
    { id: 'target', axis: 'y', value: 70, label: 'Target', color: '#ef4444', dashed: true },
  ],
  shadedRegions: [
    { id: 'maintenance', axis: 'x', start: 8, end: 12, color: '#2563eb', opacity: 0.1 },
  ],
  annotations: [
    { id: 'milestone', x: 4, y: 45, text: 'Milestone' },
  ],
  seriesOverrides: {
    treatment: {
      color: '#2563eb',
      strokeWidth: 3,
      showConfidenceInterval: true,
      showTrendLine: true,
    },
  },
  typographyPreset: 'default',
  insights: undefined,
} satisfies Partial<Chart> & Pick<Chart, 'id' | 'type' | 'title' | 'keyMessage' | 'showLabels' | 'showLegend' | 'palette' | 'transparentBg' | 'data' | 'hasData'>;

export const chartRendererProps = {
  type: lineChartFixture.type,
  data: lineChartFixture.data,
  colors: baseColors,
  showLabels: lineChartFixture.showLabels,
  showLegend: lineChartFixture.showLegend,
  transparentBg: lineChartFixture.transparentBg,
  xAxisLabel: lineChartFixture.axis?.x?.label,
  yAxisLabel: lineChartFixture.axis?.y?.label,
  gridLines: lineChartFixture.gridLines,
  axis: lineChartFixture.axis,
  referenceLines: lineChartFixture.referenceLines,
  shadedRegions: lineChartFixture.shadedRegions,
  annotations: lineChartFixture.annotations,
  seriesOverrides: lineChartFixture.seriesOverrides,
};
