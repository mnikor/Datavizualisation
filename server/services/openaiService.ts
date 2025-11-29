import OpenAI from 'openai';
import type { ProcessedDocument } from './documentProcessor';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ChartAnalysis {
  type: string;
  title: string;
  keyMessage: string;
  data: any[];
  hasData: boolean;
  dataIssue?: string;
  insights?: {
    title: string;
    points: string[];
  };
  schemaType?: 'study-design' | 'consort' | 'sankey';
  schemaData?: {
    studyPhase?: string;
    studyDesign?: string;
    screenedCount?: number;
    totalEnrolled?: number;
    randomizationRatio?: string;
    consortOrientation?: 'vertical' | 'horizontal';
    arms: Array<{
      name: string;
      description?: string;
      enrolled?: number;
      completed?: number;
      withdrawn?: number;
    }>;
    timeline?: {
      screening?: string;
      treatment?: string;
      followUp?: string;
      total?: string;
    };
    primaryEndpoints?: string[];
    secondaryEndpoints?: string[];
    keyTimepoints?: string[];
  };
}

export interface MultiChartAnalysis {
  charts: ChartAnalysis[];
}

export async function analyzeDocumentForChart(
  document: ProcessedDocument,
  chartType: string,
  userDescription: string
): Promise<MultiChartAnalysis> {
  // 1. Try deterministic extraction for Kaplan-Meier (even if auto)
  if ((chartType === 'kaplan-meier' || chartType === 'auto') && document.tables && document.tables.length > 0) {
    const extractedResult = extractKaplanMeierDataFromTable(document.tables);

    if (extractedResult) {
      const { data: rawData, xAxisLabel: rawXLabel, groupLabel: rawGroupLabel } = extractedResult;
      const uniqueGroups = Array.from(new Set(rawData.map(d => d.group)));

      // We have the raw data! Now ask AI to refine it (map groups, fix labels).
      const metaPrompt = `
      I have extracted Kaplan-Meier survival data from this document.
      
      Document Content:
      ${document.text.substring(0, 5000)}
      
      Extracted Data Summary:
      - ${rawData.length} patients
      - Raw Group Values: ${uniqueGroups.join(', ')}
      - Raw Time Column Header: "${rawXLabel}"
      - Raw Group Column Header: "${rawGroupLabel}"
      
      Your Task:
      1. Interpret the "Raw Group Values" based on the document text. Map them to meaningful clinical labels (e.g. "1" -> "Pembrolizumab", "0" -> "Placebo").
      2. Refine the X-Axis label to include units (e.g. "Survival Time (Months)").
      3. Generate a professional title and key message.
      
      Respond with JSON only:
      {
        "groupMapping": { "raw_value": "Refined Label", ... },
        "xAxisLabel": "Refined X Label",
        "title": "...",
        "keyMessage": "...",
        "insights": { "title": "...", "points": [...] }
      }
      `;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4.1',
          messages: [{ role: 'user', content: metaPrompt }],
          temperature: 0.3
        });

        const meta = JSON.parse(response.choices[0].message.content || '{}');

        // Apply Group Mapping
        const refinedData = rawData.map(d => ({
          ...d,
          group: meta.groupMapping?.[String(d.group)] || d.group
        }));

        const finalXLabel = meta.xAxisLabel || rawXLabel;

        return {
          charts: [{
            type: 'kaplan-meier',
            title: meta.title || 'Kaplan-Meier Survival Analysis',
            keyMessage: (meta.keyMessage || 'Survival analysis based on extracted data.') + ` (Source: Hybrid Extraction - Data from Table, Context from AI)`,
            data: refinedData,
            hasData: true,
            insights: meta.insights,
            schemaType: undefined,
            // @ts-ignore
            xAxisLabel: finalXLabel,
            yAxisLabel: "Survival Probability (%)"
          }]
        };
      } catch (e) {
        console.error('Error generating metadata for extracted KM data:', e);
        // Fallback to basic metadata with raw data
        return {
          charts: [{
            type: 'kaplan-meier',
            title: 'Kaplan-Meier Survival Analysis',
            keyMessage: `Survival analysis based on extracted data. (Source: Explicit Extraction from '${rawXLabel}' by '${rawGroupLabel}')`,
            data: rawData,
            hasData: true,
            schemaType: undefined,
            // @ts-ignore
            xAxisLabel: rawXLabel,
            yAxisLabel: "Survival Probability (%)"
          }]
        };
      }
    }
  }

  const prompt = buildAnalysisPrompt(document, chartType, userDescription);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: `You are a medical data analyst specializing in clinical trial visualization. 
Your job is to extract ACTUAL numerical data from medical documents and format it for publication-ready charts.

CRITICAL RULES:
- Extract REAL numerical values from the document - never create normalized, placeholder, or fictional data
- Each chart must have meaningful variance - reject datasets where all values are the same or nearly identical
- Every data point must be traceable to actual text in the source document
- Include measurement units and clinical context for all values
- If a chart would show meaningless data (all same values, <5 distinct values, zero variance), set hasData=false instead

Always respond with valid JSON only, no additional text.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const analysis: MultiChartAnalysis = JSON.parse(content);
    return analysis;
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    return {
      charts: [{
        type: chartType === 'auto' ? 'bar' : chartType,
        title: 'Analysis Error',
        keyMessage: 'Unable to process document with AI',
        data: [],
        hasData: false,
        dataIssue: `AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
}

// Helper to extract KM data deterministically from tables
function extractKaplanMeierDataFromTable(tables: any[]): { data: any[], xAxisLabel: string, groupLabel: string } | null {
  if (!tables || tables.length === 0) return null;

  for (const table of tables) {
    const rows = table.data;
    if (!Array.isArray(rows) || rows.length < 2) continue;

    // Scan first 5 rows for headers
    let headerRowIdx = -1;
    let timeIdx = -1;
    let eventIdx = -1;
    let groupCandidates: number[] = [];

    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      const headers = row.map((h: any) => String(h).toLowerCase().trim());

      const tIdx = headers.findIndex((h: string) => /time|month|week|day|duration/.test(h) && !/date/.test(h));
      const eIdx = headers.findIndex((h: string) => /event|status|outcome|death|dead|failure|recurrence/.test(h));

      // Find ALL potential group columns
      const gIndices = headers.map((h: string, idx: number) =>
        /group|arm|cohort|treatment|variant/.test(h) ? idx : -1
      ).filter(idx => idx !== -1);

      if (tIdx !== -1 && eIdx !== -1) {
        headerRowIdx = i;
        timeIdx = tIdx;
        eventIdx = eIdx;
        groupCandidates = gIndices;
        break;
      }
    }

    if (headerRowIdx === -1) continue;

    // Smart Group Selection: Prefer text columns over numeric
    let groupIdx = -1;
    if (groupCandidates.length > 0) {
      let bestScore = -1;

      for (const idx of groupCandidates) {
        let textCount = 0;
        let numCount = 0;
        // Check first 10 data rows
        for (let r = headerRowIdx + 1; r < Math.min(rows.length, headerRowIdx + 11); r++) {
          const val = rows[r][idx];
          if (typeof val === 'string' && isNaN(Number(val))) textCount++;
          else if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))) numCount++;
        }

        // Score: Text is better. If all numeric, it might be Group ID (0,1,2).
        const score = textCount > numCount ? 2 : 1;
        if (score > bestScore) {
          bestScore = score;
          groupIdx = idx;
        }
      }
    }

    // Extract Headers for Labels
    const headers = rows[headerRowIdx];
    const xAxisLabel = headers[timeIdx] ? String(headers[timeIdx]).trim() : 'Time';
    const groupLabel = groupIdx !== -1 ? String(headers[groupIdx]).trim() : 'Group';

    const data: any[] = [];

    // Iterate data rows starting after header
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      // Handle comma decimals for Time
      const rawTime = String(row[timeIdx]).replace(',', '.');
      const timeVal = parseFloat(rawTime);
      if (isNaN(timeVal)) continue;

      // Parse Event
      const eventRaw = row[eventIdx];
      let status = 0; // Default censored

      if (typeof eventRaw === 'number') {
        status = eventRaw > 0 ? 1 : 0;
      } else if (typeof eventRaw === 'string') {
        const s = eventRaw.toLowerCase().trim();
        if (['1', 'yes', 'y', 'true', 'event', 'dead', 'death', 'failed', 'failure'].includes(s)) status = 1;
        // else 0
      }

      // Parse Group
      let group = 'All Patients';
      if (groupIdx !== -1) {
        const rawGroup = row[groupIdx];
        if (rawGroup !== undefined && rawGroup !== null) {
          group = String(rawGroup).trim();
        }
      }

      // Push standardized object
      data.push({
        time: timeVal,
        status: status,
        group: group
      });
    }

    if (data.length > 5) {
      console.log(`Deterministically extracted ${data.length} KM rows. Columns: Time(${timeIdx}), Event(${eventIdx}), Group(${groupIdx})`);
      return { data, xAxisLabel, groupLabel };
    }
  }

  return null;
}

function buildAnalysisPrompt(
  document: ProcessedDocument,
  chartType: string,
  userDescription: string
): string {
  const documentContext = `
File: ${document.metadata.fileName}
Type: ${document.metadata.fileType}
${document.metadata.pageCount ? `Pages: ${document.metadata.pageCount}` : ''}
${document.metadata.sheetCount ? `Sheets: ${document.metadata.sheetCount}` : ''}

Content:
${document.text.substring(0, 15000)}
${document.text.length > 15000 ? '\n... [truncated]' : ''}
`;

  const hasUserDescription = userDescription && userDescription.trim().length > 0;

  const isAuto = chartType === 'auto';

  const userGuidance = hasUserDescription
    ? `User Request: "${userDescription}"`
    : `User Request: Intelligently analyze this document and identify the important clinical data to visualize. ${isAuto ? 'Create relevant charts (typically 1-4) based on available data.' : `Create EXACTLY ONE chart of type '${chartType}'.`}`;

  return `Analyze this clinical document and extract data for visualizations.

${documentContext}

${userGuidance}
${!isAuto ? `Requested Chart Type: ${chartType}` : 'Chart Type: Auto-detect for each visualization'}

Instructions:
${hasUserDescription
      ? '1. Extract ACTUAL numerical data from the document based on the user\'s description and create ONE chart ONLY if the data is meaningful'
      : isAuto
        ? '1. Intelligently identify datasets in this document. Create 1-4 charts based on the richness of the data. If the document contains only a single table or dataset, create ONLY ONE chart.'
        : `1. Create EXACTLY ONE chart of type '${chartType}'. Do NOT create any other charts.`
    }
2. For each potential chart, validate data quality BEFORE including it:
   - Data must have at least 5 distinct numerical values OR meaningful variance (not all the same value)
   - Values must be extracted from actual text in the document (cite source if possible)
   - Include measurement units (%, mg, months, score points, etc.) in titles or labels
   - If data fails these checks, set hasData=false with explanation instead of creating the chart
3. For each valid chart, INTELLIGENTLY select the most appropriate chart type based on data structure:
   
   CHART TYPE SELECTION RULES:
   
   📊 BAR CHART: Use for categorical comparisons or discrete groups
      - Treatment group comparisons (Drug A vs Drug B vs Placebo)
      - Adverse event frequencies by category
      - Demographic distributions (age groups, gender counts)
      - Endpoint results across different categories
   
   📈 LINE CHART: Use for trends over time or continuous progression
      - Primary/secondary endpoints measured at multiple timepoints (Week 0, 4, 8, 12)
      - Disease progression or symptom scores over study duration
      - Lab values tracked over time
      - Any data showing temporal changes or trajectories
   
   📉 AREA CHART: Use for cumulative trends or volume over time
      - Cumulative patient enrollment over time
      - Stacked time series (multiple treatment arms over time)
      - Volume or magnitude changes across timeline
   
   🥧 PIE CHART: Use for proportions that sum to 100%
      - Response rate distributions (Complete Response, Partial Response, Stable Disease, Progressive Disease)
      - Demographic proportions (ethnicity breakdown, gender distribution as %)
      - Treatment allocation percentages
   
   🏥 SPECIALIZED MEDICAL CHARTS:
      - KAPLAN-MEIER: Survival analysis. EXTRACT RAW DATA (Time, Status, Group) for every patient/subject. Do NOT calculate survival probabilities.
      - FOREST PLOT: Meta-analysis, subgroup analysis with effect sizes and confidence intervals
      - WATERFALL: Individual patient tumor response (% change from baseline)
      - SWIMMER: Patient treatment timelines with events and responses over time
      - BOX PLOT: Distribution analysis, quartiles, outliers in continuous data
      - SCATTER: Correlation between two continuous variables (add regression if relationship exists)
      - HEATMAP: Correlation matrices, biomarker expression patterns, dose-response matrices
   
   🏗️ STUDY-SCHEMA: Study design, enrollment flow, treatment arms structure
   
   DECISION PRIORITY:
   1. Check if data fits specialized medical chart (Kaplan-Meier, Forest, Waterfall, etc.) - use those when appropriate
   2. Check if data shows time progression - use LINE or AREA charts
   3. Check if data shows proportions summing to 100% - use PIE chart
   4. Check if data compares discrete categories - use BAR chart
   5. Default to BAR only if none of the above apply
   
4. Only create a STUDY SCHEMA if the document explicitly describes study design, enrollment numbers, or treatment arms. Do not create it if this information is missing.
5. For study-schema charts (including Sankey/Patient Flow):
   - If user request mentions "CONSORT" or "flow diagram", set schemaType to "consort"
   - If user request mentions "Sankey" or "patient flow", set schemaType to "sankey"
   - CRITICAL: For Sankey/Patient Flow, you MUST populate the 'schemaData' object with 'arms', 'enrolled', 'completed', and 'withdrawn' counts. Do NOT put data in the 'data' array.
   - Otherwise, default to schemaType "study-design"
6. Structure the data appropriately for each chart type with REAL VALUES from the document
7. Generate publication-quality titles that include units and context
8. Provide statistical insights based on actual data patterns
9. NEVER generate normalized data (all values = 1.0) or placeholder data - use actual values or reject the chart

SPECIAL INSTRUCTIONS FOR STUDY-SCHEMA:
- Extract 'completed' and 'withdrawn' counts for each arm.
- Synonyms for 'withdrawn': discontinued, early termination, dropouts, lost to follow-up.
- Synonyms for 'completed': finished, completed treatment, per-protocol set, completers.
- If 'completed' count is not explicitly stated but 'enrolled' and 'withdrawn' are known, CALCULATE it: Completed = Enrolled - Withdrawn.
- If 'withdrawn' is not stated but 'enrolled' and 'completed' are known, CALCULATE it: Withdrawn = Enrolled - Completed.
- Check if the study is SINGLE-ARM (no randomization to different groups). If so, return ONLY ONE arm in the 'arms' array.
- Extract 'Screened' count if available (subjects assessed for eligibility).
- For single-arm studies, set 'randomizationRatio' to null.

SPECIAL INSTRUCTIONS FOR SUBJECT DISPOSITION TABLES:
- Look for tables named "Subject Disposition", "Data Sets Analyzed", or similar.
- CLEAN DATA: Remove percentages and parentheses. Example: "93 (51.1)" should be extracted as number 93.
- Map row labels intelligently:
  - "Analyzed for safety", "Analyzed for efficacy", "Intent-to-treat", "FAS", "Safety Set" -> Map to 'analyzed' (or 'enrolled' if it's the starting set).
  - "Discontinued overall", "Discontinued", "Early termination" -> Map to 'withdrawn'.
  - "Assigned to study treatment", "Treated", "Randomized" -> Map to 'enrolled' (if explicit Enrolled count is missing).
- Ensure you map the correct column to the correct arm.

Respond with JSON in this exact format:
{
  "charts": [
    {
      "type": "chart_type",
      "title": "Publication Title",
      "keyMessage": "One-line statistical summary with p-values if applicable",
      "data": [{"key": "value", ...}, ...],
      "hasData": true/false,
      "dataIssue": "explanation if hasData is false",
      "insights": {
        "title": "Analysis Type",
        "points": ["insight 1", "insight 2", ...]
      },
      "schemaType": "study-design" (only for study-schema type, default),
      "schemaData": {
        "studyPhase": "Phase III",
        "studyDesign": "Randomized, Double-Blind, Placebo-Controlled",
        "screenedCount": 600,
        "totalEnrolled": 500,
        "randomizationRatio": "2:1",
        "arms": [
          {"name": "Treatment A", "description": "Drug X 10mg", "enrolled": 334, "completed": 310, "withdrawn": 24},
          {"name": "Placebo", "enrolled": 166, "completed": 155, "withdrawn": 11}
        ],
        "timeline": {"screening": "2 weeks", "treatment": "24 weeks", "followUp": "12 weeks", "total": "38 weeks"},
        "primaryEndpoints": ["Change from baseline in symptom score"],
        "secondaryEndpoints": ["Quality of life", "Adverse events"],
        "keyTimepoints": ["Baseline", "Week 12", "Week 24"]
      } (only for study-schema type)
    }
  ]
}

Chart-specific data formats (use descriptive keys, not generic "value"):
- Bar/Line: [{"category": "IRLS Change", "score": -8.5}, {"category": "CGI-I Response", "percentage": 67.3}] - Use specific measurement names, not "value"
- Study-Schema: Use schemaData object (see format above)
- Forest-Plot: [{"study": "Study Name", "effectSize": 1.25, "lowerCI": 1.05, "upperCI": 1.45, "weight": 25.3}, ...] (CRITICAL: Use exact keys 'study', 'effectSize', 'lowerCI', 'upperCI')
- Kaplan-Meier: [{"time": 12, "status": 1, "group": "Group A"}, {"time": 14, "status": 0, "group": "Placebo"}, ...] (CRITICAL: Extract RAW DATA rows. 'status': 1=event/death, 0=censored. 'group': MUST be original string label (e.g. "Group A"), NEVER convert to numbers.)
- Waterfall: [{"patient": "Pt-001", "response": -35.5, "bestResponse": "PR", "pdThreshold": 20}, ...]
- Swimmer: [{"patient": "Pt-001", "start": 0, "end": 12, "response": "PR", "events": ["AE1:3", "AE2:8"]}, ...]
- Box-Plot: [{"category": "Treatment A", "min": 10, "q1": 15, "median": 20, "q3": 25, "max": 30, "outliers": [5, 35]}, ...]
- Scatter: [{"x": 45.2, "y": 120.5, "group": "Treatment A"}, ...]
- Heatmap: [{"row": "Gene A", "column": "Patient 1", "value": 0.85}, ...]

DATA QUALITY EXAMPLES:
✅ GOOD: [{"endpoint": "IRLS Change", "value": -8.5}, {"endpoint": "CGI-I", "value": 67.3}, {"endpoint": "VAS Pain", "value": -4.2}] - Different values with variance
❌ BAD: [{"endpoint": "A", "value": 1}, {"endpoint": "B", "value": 1}, {"endpoint": "C", "value": 1}] - All same value, meaningless
❌ BAD: [{"category": "X", "value": 100}, {"category": "Y", "value": 100}] - No variance, reject this chart
✅ GOOD: Extract actual numbers from tables/text in the document, preserve their clinical significance

IMPORTANT: 
- Create ${hasUserDescription ? '1 chart' : '4-6 different charts'} based on ACTUAL data in the document
- If a chart would have all identical values or <5 distinct values, set hasData=false instead
- Use descriptive data keys that match the clinical measurement (not generic "value" unless truly generic data)
- Include units in titles: "Mean Change in IRLS Score (points)" not just "IRLS Change"`;
}
