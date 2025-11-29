# MediInsightViz - Technical Specification

## Overview
An AI-powered medical publication visualization dashboard that extracts data from clinical documents (PDF, Excel, CSV) and generates publication-ready charts suitable for peer-reviewed journals like Nature, NEJM, and JAMA.

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query v5)
- **UI Components**: Radix UI + Shadcn/ui (New York variant)
- **Styling**: Tailwind CSS with custom CSS variables
- **Charts**: Recharts library
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React + React Icons

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **File Processing**: 
  - PDF: pdf-parse
  - Excel: xlsx
  - CSV: csv-parse
- **Upload Handling**: Multer (10MB limit)
- **AI Service**: OpenAI GPT-4.1 (temperature: 0.3)

### Storage
- In-memory storage (MemStorage) - session-only
- Database-ready interface with Drizzle ORM (PostgreSQL via Neon)
- Charts persist only in frontend state, disappear on refresh

## Core Features

### 1. Document Upload & Processing
- **Supported Formats**: PDF, Excel (.xlsx, .xls), CSV
- **Max File Size**: 10MB
- **Security**: MIME type validation, file extension checking
- **Processing Flow**: Upload → Parse → AI Analysis → Chart Generation

### 2. AI-Powered Analysis
- **Model**: OpenAI GPT-4.1
- **Temperature**: 0.3 (for consistent, factual medical data)
- **Capabilities**:
  - Automatic data extraction from clinical documents
  - Multi-chart generation (4-6 charts per document)
  - Study schema detection (enrollment, arms, timeline)
  - Statistical insights generation
  - Data quality assessment

### 3. Chart Types

#### Basic Charts
1. **Bar Chart** - Category comparisons
2. **Line Chart** - Trends over time
3. **Area Chart** - Cumulative data
4. **Pie Chart** - Proportional data

#### Medical-Specific Charts
5. **Demographics Chart** - Age/gender distribution
6. **Survival Chart** - Treatment vs placebo over time
7. **Efficacy Chart** - Treatment outcomes

#### Advanced Medical Charts
8. **Forest Plot** - Meta-analysis with effect sizes, CI, weights
9. **Kaplan-Meier Curve** - Survival analysis with censoring
10. **Waterfall Plot** - Individual tumor response
11. **Swimmer Plot** - Patient treatment timelines
12. **Box Plot** - Statistical distribution
13. **Scatter Plot** - Correlation with regression line
14. **Heatmap** - Data density/correlation matrices

#### Study Schemas
15. **Study Design Timeline** (default)
16. **CONSORT Flow Diagram** (1-10 arms)
17. **Sankey Patient Flow** (unlimited arms)

### 4. Customization Options

#### Visual Settings
- **Color Palettes**: Default, Johnson & Johnson, Nature Publishing, NEJM, Vibrant
- **Labels**: X-axis, Y-axis customizable
- **Legend**: Show/hide toggle
- **Background**: Transparent or card background
- **Table Options**: Borders, striped rows, compact mode

#### Schema Settings
- Switch between Study Design, CONSORT, Sankey visualizations
- Responsive layouts supporting 1-10+ treatment arms

### 5. Export Formats
- **PNG**: Raster image for presentations
- **SVG**: Vector graphics for publications
- **PDF**: Multi-page document with charts, tables, insights
- **PowerPoint (PPT)**: Editable slides with charts and data

All export formats support:
- Charts (all types)
- Tables with color palettes
- Study schema visualizations
- Insights panels

## Data Models

### Chart Schema
```typescript
{
  id: number;
  type: ChartType;
  title: string;
  keyMessage: string;
  data: ChartDataPoint[];
  hasData: boolean;
  dataIssue?: string;
  insights?: {
    title: string;
    points: string[];
  };
  showLabels: boolean;
  showLegend: boolean;
  palette: PaletteType;
  transparentBg: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  tableBorders?: boolean;
  tableStriped?: boolean;
  tableCompact?: boolean;
  schemaType?: SchemaType;
  schemaData?: StudySchemaData;
}
```

### Study Schema Data
```typescript
{
  studyPhase: string;
  studyDesign: string;
  totalEnrolled: number;
  randomizationRatio: string;
  arms: Array<{
    name: string;
    description: string;
    enrolled: number;
    completed: number;
    withdrawn: number;
  }>;
  timeline: {
    screening: string;
    treatment: string;
    followUp: string;
    total: string;
  };
  primaryEndpoints: string[];
  secondaryEndpoints: string[];
  keyTimepoints: string[];
}
```

## API Endpoints

### POST /api/analyze-document
**Purpose**: Upload and analyze medical documents

**Request**:
- `Content-Type`: multipart/form-data
- `file`: PDF/Excel/CSV file (max 10MB)
- `chartType`: 'auto' | specific chart type
- `description`: Optional user guidance

**Response**:
```json
[
  {
    "id": 1760012744069,
    "type": "forest-plot",
    "title": "Meta-Analysis Results",
    "data": [...],
    "insights": {...},
    ...
  }
]
```

**Data Format Normalization**:
- Forest Plot: Converts `ci_lower`/`ci_upper` → `lowerCI`/`upperCI`
- All charts: Provides safe defaults for missing fields
- Type mapping for unsupported chart types

## UI Components

### Main Pages
1. **Dashboard** (`/`) - Main chart visualization area
2. **Not Found** - 404 handler

### Key Components

#### ChartRenderer
- Central component routing to specific chart types
- Handles 15+ chart types
- Calculates dynamic heights and margins
- Applies color palettes and styling

#### UploadModal
- File upload with drag & drop
- Chart type selection (all 15 types)
- Optional description input
- File validation and progress

#### SettingsModal
- Chart type switching
- Visual customization (labels, legend, colors)
- Table formatting options
- Schema type switching (for study schemas)

#### Export Components
- PNG export via html2canvas
- SVG extraction from Recharts
- PDF generation with jsPDF
- PPT creation with PptxGenJS

#### Advanced Chart Components
- ForestPlot.tsx - Meta-analysis visualization
- KaplanMeierPlot.tsx - Survival curves
- WaterfallPlot.tsx - Tumor response
- SwimmerPlot.tsx - Treatment timelines
- BoxPlot.tsx - Statistical distributions
- ScatterWithRegression.tsx - Correlation analysis
- Heatmap.tsx - Data density matrices

#### Study Schema Components
- StudyDesignSchema.tsx - Timeline visualization
- ConsortFlowDiagram.tsx - Flow diagram (1-10 arms)
- SankeyDiagram.tsx - Patient flow (unlimited arms)

## Design System

### Colors (CSS Variables in index.css)
```css
--background: HSL values
--foreground: HSL values
--card: HSL values
--primary: HSL values
--secondary: HSL values
--muted: HSL values
--accent: HSL values
--destructive: HSL values
--border: HSL values
```

### Dark Mode
- Class-based: `darkMode: ["class"]` in tailwind.config.ts
- Toggle in header
- All charts and components support dark mode

### Typography
- Primary: Inter (Google Fonts)
- Monospace: JetBrains Mono (for data)

## Edge Case Handling

### Chart Data Validation
- Empty dataset guards (returns "No data available")
- Zero-variance protection in BoxPlot, Heatmap
- Division by zero prevention (ForestPlot weights, SwimmerPlot timeline)
- Uniform value handling in statistical charts
- Safe default values for missing fields

### File Upload
- MIME type validation
- Extension whitelist
- Size limit enforcement (10MB)
- Error messaging for invalid files

## Setup Instructions

### Prerequisites
- Node.js 18+
- OpenAI API key

### Environment Variables
```env
OPENAI_API_KEY=your_key_here
SESSION_SECRET=your_secret_here
```

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Runs on port 5000 (Express backend + Vite frontend)

### Build
```bash
npm run build
```

## Key Dependencies

### Production
- react, react-dom - ^18.x
- express - ^4.x
- @tanstack/react-query - ^5.x
- recharts - Latest
- openai - Latest
- zod - Latest
- drizzle-orm - Latest
- pdf-parse, xlsx, csv-parse - Latest
- multer - Latest
- jspdf, pptxgenjs - Latest
- lucide-react - Latest

### Development
- typescript - ^5.x
- vite - ^5.x
- @vitejs/plugin-react - Latest
- tailwindcss - ^3.x
- drizzle-kit - Latest

## Project Structure
```
/client/src
  /components       - React components
  /pages           - Page components
  /lib             - Utilities, queryClient
  App.tsx          - Main app with routing
  
/server
  /services        - Business logic
    documentProcessor.ts
    openaiService.ts
  routes.ts        - API routes
  storage.ts       - Storage interface
  index.ts         - Express server
  
/shared
  schema.ts        - Shared types and schemas
  
/attached_assets   - User uploaded images
```

## Important Notes

### Data Persistence
- Charts are NOT persisted to database
- All data exists only in frontend session state
- Data disappears on page refresh
- Backend only processes and returns chart data

### AI Prompt Engineering
- Structured JSON responses
- Chart-specific data format requirements
- Multi-chart generation logic
- Study schema detection rules
- Field name normalization for consistency

### Security Considerations
- File upload validation (type, size, extension)
- API key stored in environment variables
- No sensitive data in git (excluded via .gitignore)
- Multer memory storage (no disk writes)

## Known Limitations
1. No user authentication system
2. No persistent storage (charts lost on refresh)
3. 10MB file size limit
4. Session-only data storage
5. Requires OpenAI API key for document analysis

## Future Enhancement Opportunities
1. Database persistence (PostgreSQL ready via Drizzle)
2. User authentication (Passport.js configured)
3. "From Existing Data" feature
4. Chart templates library
5. Batch document processing
6. Real-time collaboration
7. Chart version history

---

**Version**: 1.0
**Last Updated**: October 2025
**License**: (Specify as needed)
