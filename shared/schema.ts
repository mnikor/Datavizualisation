import { z } from 'zod';

export type PaletteKey =
  | 'default'
  | 'jnj'
  | 'nature'
  | 'nejm'
  | 'vibrant'
  | 'grayscale'
  | 'colorblind';
export type SchemaType = 'study-design' | 'consort' | 'sankey';

export type ConsortOrientation = 'vertical' | 'horizontal';

export type AxisScale = 'linear' | 'log';

export interface AxisConfig {
  min?: number;
  max?: number;
  scale?: AxisScale;
  label?: string;
}

export interface GridlineConfig {
  showX?: boolean;
  showY?: boolean;
  dashed?: boolean;
}

export interface ReferenceLineConfig {
  id: string;
  axis: 'x' | 'y';
  value: number;
  label?: string;
  color?: string;
  dashed?: boolean;
}

export interface ShadedRegionConfig {
  id: string;
  axis: 'x' | 'y';
  start: number;
  end: number;
  label?: string;
  color?: string;
  opacity?: number;
}

export interface AnnotationConfig {
  id: string;
  x: number;
  y: number;
  text: string;
  color?: string;
}

export interface SeriesOverrideConfig {
  color?: string;
  strokeWidth?: number;
  showConfidenceInterval?: boolean;
  showTrendLine?: boolean;
}

export type TypographyPreset = 'default' | 'nejm' | 'nature' | 'jama';

export interface StudySchemaData {
  studyPhase?: string;
  studyDesign?: string;
  totalEnrolled?: number;
  randomizationRatio?: string;
  consortOrientation?: ConsortOrientation;
  arms: {
    name: string;
    description?: string;
    enrolled?: number;
    completed?: number;
    withdrawn?: number;
  }[];
  timeline?: {
    screening?: string;
    treatment?: string;
    followUp?: string;
    total?: string;
  };
  primaryEndpoints?: string[];
  secondaryEndpoints?: string[];
  keyTimepoints?: string[];
}

export interface Chart {
  id: number;
  type: string;
  title: string;
  showLabels: boolean;
  showLegend: boolean;
  palette: PaletteKey;
  transparentBg: boolean;
  keyMessage: string;
  data: any[];
  hasData: boolean;
  dataIssue?: string;
  insights?: {
    title: string;
    points: string[];
  };
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
  typographyPreset?: TypographyPreset;
  caption?: string;
  captionSource?: string;
  figureNumber?: string;
}

export const studySchemaDataSchema = z.object({
  studyPhase: z.string().optional(),
  studyDesign: z.string().optional(),
  totalEnrolled: z.number().optional(),
  randomizationRatio: z.string().optional(),
  consortOrientation: z.enum(['vertical', 'horizontal']).optional(),
  arms: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    enrolled: z.number().optional(),
    completed: z.number().optional(),
    withdrawn: z.number().optional()
  })),
  timeline: z.object({
    screening: z.string().optional(),
    treatment: z.string().optional(),
    followUp: z.string().optional(),
    total: z.string().optional()
  }).optional(),
  primaryEndpoints: z.array(z.string()).optional(),
  secondaryEndpoints: z.array(z.string()).optional(),
  keyTimepoints: z.array(z.string()).optional()
});

export const insertChartSchema = z.object({
  type: z.string(),
  title: z.string(),
  showLabels: z.boolean().default(true),
  showLegend: z.boolean().default(true),
  palette: z.enum(['default', 'jnj', 'nature', 'nejm', 'vibrant', 'grayscale', 'colorblind']).default('default'),
  transparentBg: z.boolean().default(false),
  keyMessage: z.string(),
  data: z.array(z.any()),
  hasData: z.boolean().default(false),
  dataIssue: z.string().optional(),
  insights: z.object({
    title: z.string(),
    points: z.array(z.string())
  }).optional(),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  tableBorders: z.boolean().optional(),
  tableStriped: z.boolean().optional(),
  tableCompact: z.boolean().optional(),
  schemaType: z.enum(['study-design', 'consort', 'sankey']).optional(),
  schemaData: studySchemaDataSchema.optional(),
  barOrientation: z.enum(['horizontal', 'vertical']).optional(),
  gridLines: z.object({
    showX: z.boolean().optional(),
    showY: z.boolean().optional(),
    dashed: z.boolean().optional(),
  }).optional(),
  axis: z.object({
    x: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      scale: z.enum(['linear', 'log']).optional(),
      label: z.string().optional(),
    }).optional(),
    y: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      scale: z.enum(['linear', 'log']).optional(),
      label: z.string().optional(),
    }).optional(),
  }).optional(),
  referenceLines: z.array(z.object({
    id: z.string(),
    axis: z.enum(['x', 'y']),
    value: z.number(),
    label: z.string().optional(),
    color: z.string().optional(),
    dashed: z.boolean().optional(),
  })).optional(),
  shadedRegions: z.array(z.object({
    id: z.string(),
    axis: z.enum(['x', 'y']),
    start: z.number(),
    end: z.number(),
    label: z.string().optional(),
    color: z.string().optional(),
    opacity: z.number().optional(),
  })).optional(),
  annotations: z.array(z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    text: z.string(),
    color: z.string().optional(),
    showArrow: z.boolean().optional(),
    ax: z.number().optional(),
    ay: z.number().optional(),
  })).optional(),
  seriesOverrides: z.record(z.object({
    color: z.string().optional(),
    strokeWidth: z.number().optional(),
    showConfidenceInterval: z.boolean().optional(),
    showTrendLine: z.boolean().optional(),
  })).optional(),
  typographyPreset: z.enum(['default', 'nejm', 'nature', 'jama']).optional(),
  caption: z.string().optional(),
  captionSource: z.string().optional(),
  figureNumber: z.string().optional(),
});

export type InsertChart = z.infer<typeof insertChartSchema>;

export const updateChartSchema = insertChartSchema.partial();
export type UpdateChart = z.infer<typeof updateChartSchema>;

export interface DocumentAnalysisRequest {
  fileContent: string;
  fileName: string;
  fileType: string;
  chartType: string;
  description: string;
}

export const documentAnalysisSchema = z.object({
  fileContent: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  chartType: z.string(),
  description: z.string()
});
