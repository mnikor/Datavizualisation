# Medical Publication Visualization Dashboard

## Overview

This is an AI-powered medical publication visualization dashboard designed to create publication-ready charts from clinical trial data. The application allows researchers and clinicians to upload medical documents (PDF, Excel, CSV) and automatically generate high-quality, journal-standard visualizations suitable for peer-reviewed publications like Nature, NEJM, and JAMA.

The system processes medical documents, extracts relevant data, and creates customizable charts with professional color palettes, insights analysis, and export capabilities. It emphasizes scientific precision, publication quality, and efficient workflow from data upload to chart export.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**October 10, 2024**: Enhanced chart quality and AI intelligence
- Improved AI prompt with strict data quality requirements (no normalized/placeholder data, enforce variance checks, require measurement units)
- Added server-side type-aware validation to detect and reject meaningless datasets (all identical values, zero variance, <3 distinct values)
- Removed unnecessary "value" labels from chart legends - now hide generic legends for single-series charts
- Implemented smart legend formatting that capitalizes and formats data keys properly
- Validation now schema-aware (study-schema, table types bypass numeric checks while numeric charts enforce quality standards)
- Improved dashboard layout: study schemas display full-width, all other charts display two per row for optimal visualization
- Enhanced AI chart type selection with intelligent decision rules - now chooses line charts for time trends, pie charts for proportions, specialized medical charts for clinical scenarios, reducing over-reliance on bar charts
- Fixed bar chart rendering: added minimum bar size (3px) so small values are always visible, converted to horizontal layout (bars grow left-to-right) with category labels on Y-axis to eliminate label overlap

**October 9, 2024**: Updated AI model and chart generation settings
- Upgraded from GPT-4o-mini to GPT-4.1 for improved medical data analysis
- Increased chart generation from 2-4 to 4-6 charts per document based on data availability
- Enhanced multi-chart capabilities for comprehensive clinical data visualization

**October 9, 2024**: Added 7 advanced medical chart types
- Implemented Forest Plot with effect sizes, confidence intervals, summary diamonds, and heterogeneity statistics for meta-analysis
- Implemented Kaplan-Meier survival curves with step functions, censoring marks, confidence bands, and median survival lines
- Implemented Waterfall Plot for tumor response visualization with baseline reference and progressive disease thresholds
- Implemented Swimmer Plot for treatment timelines with patient duration, response indicators, and adverse event markers
- Implemented Box Plot with quartiles, outliers, and distribution visualization for statistical analysis
- Implemented Scatter Plot with linear regression line, correlation coefficient (R²), and optional grouping
- Implemented Heatmap with color gradient scaling for correlation matrices and data density visualization
- All new chart types include comprehensive edge case handling (zero-variance, uniform values, zero-range datasets)
- Updated AI service to recognize and generate appropriate data structures for all 7 new chart types
- Updated both Upload Modal and Settings Modal to include all new chart types
- All new charts work with color palettes, labels, legends, and export formats (PNG, SVG, PDF, PPT)

**October 9, 2024**: Added study schema visualization feature
- Implemented 3 study schema visualization types: Study Design Timeline (default), CONSORT Flow Diagram, Sankey Patient Flow
- Enhanced AI to automatically detect and extract study structure from clinical documents (phases, arms, enrollment, timeline, endpoints)
- Created responsive layouts supporting 1-10 treatment arms for CONSORT, unlimited arms for Study Design and Sankey
- Added schema type selector in settings modal for switching between visualization options
- Integrated study schemas with existing color palette and export systems (PNG, SVG, PDF, PPT)
- All export formats support study schema visualizations

**October 9, 2024**: Fixed table palette bug and added PPT export
- Fixed table color palette changes to properly update on all subsequent changes (added React keys for re-rendering)
- Restored and fixed SVG export for vector charts (extracts native Recharts SVG)
- Added PowerPoint (PPT) export with editable content including charts, tables, and insights slides
- Export options: PNG, SVG, PDF, PPT all working correctly

**October 8, 2024**: Completed full-stack AI integration
- Implemented secure file upload with 10MB size limit and MIME type validation  
- Integrated OpenAI GPT-4.1 for medical document analysis
- Built document processing pipeline for PDF, Excel, and CSV files
- Connected frontend to backend APIs with React Query
- Added comprehensive error handling and security measures
- Tested end-to-end workflow: upload → AI processing → chart generation → customization → export

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**Routing**: Wouter for lightweight client-side routing

**State Management**: 
- TanStack Query (React Query) for server state management and API data fetching
- Local React state for UI interactions and component state

**UI Component Library**: 
- Radix UI primitives for accessible, unstyled components
- Shadcn/ui design system (New York variant) built on Radix UI
- Tailwind CSS for styling with custom CSS variables for theming

**Chart Visualization**: Recharts library for creating responsive, publication-ready charts including bar charts, line charts, area charts, and pie charts

**Design Philosophy**: Material Design principles adapted for medical/scientific publishing with focus on data clarity, professional trust, and publication-ready output quality

**Key Features**:
- Multiple pre-configured color palettes (Default, Johnson & Johnson, Nature Publishing, NEJM, Vibrant)
- Dark mode support optimized for medical night reading
- Chart customization (labels, legends, backgrounds, titles)
- AI-generated insights panels with key analysis points
- Data quality warnings with actionable suggestions
- Export functionality for publication-ready outputs

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ES modules

**API Design**: RESTful API with JSON responses

**Key Endpoints**:
- GET `/api/charts` - Retrieve all charts
- GET `/api/charts/:id` - Retrieve specific chart
- POST `/api/charts` - Create new chart
- PATCH `/api/charts/:id` - Update chart settings
- DELETE `/api/charts/:id` - Delete chart
- POST `/api/upload` - Upload and process medical documents

**Document Processing**:
- PDF parsing using pdf-parse library
- Excel file processing with XLSX library
- CSV parsing using csv-parse
- Multi-format support for clinical trial data extraction

**Data Validation**: Zod schema validation for type safety and runtime validation

**Storage Strategy**: 
- In-memory storage (MemStorage) for development
- Database-ready interface (IStorage) for easy migration to persistent storage
- Drizzle ORM configured for PostgreSQL (via Neon serverless driver)

### Data Storage Solutions

**Current Implementation**: In-memory storage using JavaScript objects and arrays

**Database Configuration**: 
- PostgreSQL ready via Drizzle ORM
- Neon serverless driver (@neondatabase/serverless) configured
- Schema defined in `shared/schema.ts` with TypeScript types
- Migration system configured via drizzle-kit

**Data Models**:
- Chart entity with properties: id, type, title, visualization settings (labels, legend, palette, background), data array, insights, and data quality indicators

### Authentication and Authorization

**Current State**: No authentication system implemented

**Session Management**: Connect-pg-simple package included for future PostgreSQL session storage

### External Dependencies

**AI Service**: 
- OpenAI GPT-4.1 integration for document analysis and chart recommendations
- Structured JSON responses for chart data extraction
- Temperature set to 0.3 for consistent, factual medical data analysis
- Analyzes documents to extract structured data and generate insights

**File Processing Libraries**:
- pdf-parse for PDF document extraction
- xlsx for Excel workbook processing
- csv-parse for CSV file parsing
- multer for handling multipart/form-data file uploads

**UI Component Dependencies**:
- Comprehensive Radix UI component collection (@radix-ui/react-*)
- Recharts for data visualization
- Lucide React for icons
- React Hook Form with Zod resolvers for form validation
- date-fns for date manipulation

**Development Tools**:
- Vite for fast development and optimized production builds
- TSX for TypeScript execution in development
- ESBuild for server bundle compilation
- Replit-specific plugins for development environment integration

**Font Services**: Google Fonts CDN for Inter (primary) and JetBrains Mono (monospace/data) typefaces