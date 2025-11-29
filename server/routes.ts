import type { Express } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { processDocument } from './services/documentProcessor';
import { analyzeDocumentForChart } from './services/openaiService';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv'
];

const ALLOWED_EXTENSIONS = ['pdf', 'xlsx', 'xls', 'csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Validate chart data quality (type-aware validation)
function validateChartData(chartData: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  const chartType = (chartData.type || '').toLowerCase();

  // Chart types that don't need numeric data validation
  const nonNumericTypes = ['study-schema', 'table', 'consort', 'sankey'];

  // Schema-based charts use schemaData instead of data array
  if (chartType === 'study-schema') {
    // Check if schemaData exists and has required fields
    if (!chartData.schemaData || !chartData.schemaData.arms || chartData.schemaData.arms.length === 0) {
      return { isValid: false, issues: ['Study schema data is missing or incomplete'] };
    }
    return { isValid: true, issues: [] };
  }

  // Skip validation for other non-numeric types
  if (nonNumericTypes.includes(chartType)) {
    return { isValid: true, issues: [] };
  }

  // For numeric chart types, validate the data array
  if (!Array.isArray(chartData.data) || chartData.data.length === 0) {
    return { isValid: false, issues: ['No data available'] };
  }

  // Extract all numeric values from the data
  const numericValues: number[] = [];
  chartData.data.forEach((item: any) => {
    Object.values(item).forEach(value => {
      if (typeof value === 'number' && !isNaN(value)) {
        numericValues.push(value);
      }
    });
  });

  if (numericValues.length === 0) {
    issues.push('No numeric data found in dataset');
    return { isValid: false, issues };
  }

  // Check for minimum data points
  // We generally want at least 2 points to make a comparison or show a trend
  if (chartData.data.length < 2) {
    issues.push('Insufficient data points - at least 2 values are required for a meaningful chart');
    return { isValid: false, issues };
  }

  // Check for variance - all values shouldn't be identical
  const uniqueValues = new Set(numericValues);
  if (uniqueValues.size === 1) {
    issues.push('All values are identical - no meaningful variance to visualize');
    return { isValid: false, issues };
  }

  // Check for minimum distinct values (unless it's a simple comparison)
  if (uniqueValues.size < 2 && chartData.data.length > 2) {
    issues.push('Insufficient data variance - only ' + uniqueValues.size + ' distinct values');
  }

  // Check for zero or near-zero range
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = max - min;

  if (range === 0) {
    issues.push('Data has zero range - all values are the same');
    return { isValid: false, issues };
  }

  // Warn about suspicious patterns (all values = 1.0, all values = 100, etc.)
  if (uniqueValues.size <= 2 && (uniqueValues.has(1) || uniqueValues.has(100))) {
    issues.push('Data appears to be normalized or placeholder values');
  }

  return { isValid: issues.length === 0, issues };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed types: PDF, Excel, CSV`));
    }

    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }

    cb(null, true);
  }
});

export function registerRoutes(app: Express) {
  // Storage-based routes removed - charts are not persisted
  // All chart data is session-only in frontend state

  app.post('/api/export-chart', async (req, res) => {
    try {
      const { svg, format, title, dpi, widthMm, heightMm } = req.body ?? {};

      if (typeof svg !== 'string' || svg.trim().length === 0) {
        return res.status(400).json({ error: 'SVG content is required for export.' });
      }

      const normalizedFormat = String(format ?? 'png').toLowerCase();
      const safeTitle = typeof title === 'string' && title.trim().length > 0 ? title.trim() : 'chart';
      const parsedDpi = Number(dpi);
      const density = Number.isFinite(parsedDpi)
        ? Math.min(Math.max(Math.round(parsedDpi), 72), 1200)
        : 300;

      const svgBuffer = Buffer.from(svg, 'utf8');

      const clamp = (value: number, min: number, max: number) => {
        if (Number.isNaN(value)) return value;
        return Math.min(Math.max(value, min), max);
      };

      const widthMmValue = Number(widthMm);
      const heightMmValue = Number(heightMm);

      const mmToPixels = (mm: number) => Math.max(1, Math.round((mm * density) / 25.4));

      const resizeOptions: sharp.ResizeOptions = { fit: 'inside', withoutEnlargement: false };
      let shouldResize = false;

      if (Number.isFinite(widthMmValue) && widthMmValue > 0) {
        const clamped = clamp(widthMmValue, 40, 190);
        resizeOptions.width = mmToPixels(clamped);
        shouldResize = true;
      }

      if (Number.isFinite(heightMmValue) && heightMmValue > 0) {
        const clamped = clamp(heightMmValue, 40, 230);
        resizeOptions.height = mmToPixels(clamped);
        shouldResize = true;
      }

      const createPipeline = () => {
        let transformer = sharp(svgBuffer, { density });
        if (shouldResize) {
          transformer = transformer.resize(resizeOptions);
        }
        return transformer;
      };

      const reply = async (
        pipeline: sharp.Sharp,
        contentType: string,
        extension: string,
        extraOptions?: sharp.PngOptions | sharp.TiffOptions
      ) => {
        let data: Buffer;
        let info: sharp.OutputInfo;

        if (extension === 'png') {
          ({ data, info } = await pipeline
            .png({ compressionLevel: 9, ...extraOptions })
            .toBuffer({ resolveWithObject: true }));
        } else {
          ({ data, info } = await pipeline
            .tiff({ compression: 'lzw', resolutionUnit: 'inch', xres: density, yres: density, ...extraOptions })
            .toBuffer({ resolveWithObject: true }));
        }

        const infoWithDensity = info as sharp.OutputInfo & { density?: number };
        const effectiveDensity = infoWithDensity.density ?? density;
        const widthMmActual = info.width ? Number(((info.width * 25.4) / effectiveDensity).toFixed(2)) : null;
        const heightMmActual = info.height ? Number(((info.height * 25.4) / effectiveDensity).toFixed(2)) : null;

        res.json({
          data: data.toString('base64'),
          contentType,
          fileExtension: extension,
          suggestedName: `${safeTitle.replace(/\s+/g, '_')}.${extension}`,
          width: info.width ?? null,
          height: info.height ?? null,
          dpi: infoWithDensity.density ?? density,
          widthMm: widthMmActual,
          heightMm: heightMmActual,
        });
      };

      if (normalizedFormat === 'png') {
        const pipeline = createPipeline();
        return await reply(pipeline, 'image/png', 'png');
      }

      if (normalizedFormat === 'tiff' || normalizedFormat === 'tif') {
        const pipeline = createPipeline();
        return await reply(pipeline, 'image/tiff', 'tiff');
      }

      return res.status(400).json({ error: `Unsupported export format: ${normalizedFormat}` });
    } catch (error) {
      console.error('Export error:', error);
      return res.status(500).json({
        error: 'Failed to export chart',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post('/api/analyze-document', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const chartType = (req.body.chartType || req.query.chartType) as string;
      const description = (req.body.description || req.query.description) as string;
      console.log('Received upload request:', {
        chartType,
        description,
        file: req.file?.originalname,
        source: req.body.chartType ? 'body' : 'query'
      });

      const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase() || '';
      const fileType = fileExtension === 'xlsx' || fileExtension === 'xls' ? 'xlsx' : fileExtension === 'csv' ? 'csv' : 'pdf';

      const processedDoc = await processDocument(
        req.file.buffer,
        req.file.originalname,
        fileType
      );

      const analysis = await analyzeDocumentForChart(
        processedDoc,
        chartType || 'auto',
        description || ''
      );

      // Don't persist charts - return them directly to frontend
      // They'll only exist in the frontend session and disappear on refresh
      const charts = analysis.charts.map((chartData, index) => {
        // Validate chart data quality
        const validation = validateChartData(chartData);

        // Ensure hasData is set correctly based on validation
        const hasActualData = validation.isValid;

        // Normalize chart type to lowercase and map to supported types
        // Default to 'bar' if type is missing or invalid
        let normalizedType = (chartData.type || 'bar').toLowerCase();

        // Map unsupported types to appropriate chart types
        const typeMapping: Record<string, string> = {
          'adverse events': 'bar',
          'quality of life': 'bar',
          'qol': 'bar'
        };

        let forcedSchemaType: string | undefined;
        if (normalizedType.includes('sankey') || normalizedType.includes('patient flow')) {
          normalizedType = 'study-schema';
          forcedSchemaType = 'sankey';
        }

        if (typeMapping[normalizedType]) {
          normalizedType = typeMapping[normalizedType];
        }

        // Normalize forest plot data field names (AI might use ci_lower/ci_upper instead of lowerCI/upperCI)
        let normalizedData = chartData.data;
        if (normalizedType === 'forest-plot' && Array.isArray(normalizedData)) {
          console.log('Original forest plot data:', JSON.stringify(normalizedData, null, 2));
          normalizedData = normalizedData.map((item: any) => {
            // Helper to find value from multiple possible keys
            const findValue = (keys: string[], defaultValue: any) => {
              for (const key of keys) {
                if (item[key] !== undefined && item[key] !== null) return item[key];
              }
              return defaultValue;
            };

            const study = findValue(['study', 'name', 'label', 'group', 'source', 'id'], 'Unknown Study');
            const effectSize = findValue(['effectSize', 'effect_size', 'mean', 'value', 'estimate', 'es', 'oddsRatio', 'riskRatio', 'hazardRatio'], 1);
            const lowerCI = findValue(['lowerCI', 'ci_lower', 'lower_ci', 'min', 'low', 'lower', 'from'], 0.8);
            const upperCI = findValue(['upperCI', 'ci_upper', 'upper_ci', 'max', 'high', 'upper', 'to'], 1.2);
            const weight = findValue(['weight', 'w', 'size'], 1);

            const normalized = {
              study,
              effectSize: Number(effectSize),
              lowerCI: Number(lowerCI),
              upperCI: Number(upperCI),
              weight: Number(weight)
            };
            console.log('Normalized item:', normalized);
            return normalized;
          });
        }

        const normalizedSchemaData = normalizedType === 'study-schema' && chartData.schemaData
          ? {
            ...chartData.schemaData,
            consortOrientation: chartData.schemaData.consortOrientation || 'vertical',
          }
          : chartData.schemaData;

        return {
          id: Date.now() + index, // Temporary ID for frontend
          ...chartData,
          type: normalizedType, // Use normalized lowercase type
          data: normalizedData, // Use normalized data with corrected field names
          hasData: hasActualData, // Override AI's hasData with validation check
          dataIssue: !hasActualData ? (validation.issues.join('; ') || chartData.dataIssue) : chartData.dataIssue, // Include validation issues
          showLabels: true,
          showLegend: true,
          palette: 'default',
          transparentBg: false,
          tableBorders: true,
          tableStriped: true,
          tableCompact: false,

          schemaType: forcedSchemaType || (normalizedType === 'study-schema' ? (chartData.schemaType || 'consort') : chartData.schemaType),
          schemaData: normalizedSchemaData,
        };
      }).filter(chart => {
        // 1. Must have data
        if (!chart.hasData) return false;

        // 2. If user requested a specific type, ONLY allow that type
        if (chartType && chartType !== 'auto') {
          // Normalize both to compare
          const requested = chartType.toLowerCase();
          const actual = chart.type.toLowerCase();

          // Allow exact matches
          if (actual === requested) return true;

          // Allow special cases mapping
          // e.g. if user asked for "bar", allow "column" or "bar"
          // e.g. if user asked for "study-schema", allow "consort" or "sankey"
          if (requested === 'study-schema' && ['consort', 'sankey', 'study-design'].includes(actual)) return true;

          return false;
        }

        return true;
      });

      // If specific type requested, take ONLY the first valid one to prevent duplicates
      if (chartType && chartType !== 'auto' && charts.length > 1) {
        res.status(201).json([charts[0]]);
        return;
      }

      res.status(201).json(charts);
    } catch (error) {
      console.error('Document analysis error:', error);
      res.status(500).json({
        error: 'Failed to analyze document',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
