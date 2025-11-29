# MediInsightViz

**AI-Powered Medical Publication Visualization Dashboard**

Transform clinical trial documents into publication-ready visualizations for peer-reviewed journals like Nature, NEJM, and JAMA.

![Medical Publication Dashboard](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## ✨ Features

### 📊 15+ Chart Types
- **Basic Charts**: Bar, Line, Area, Pie
- **Medical Charts**: Demographics, Survival, Efficacy
- **Advanced Medical**: Forest Plot, Kaplan-Meier, Waterfall, Swimmer, Box Plot, Scatter, Heatmap
- **Study Schemas**: Study Design Timeline, CONSORT Flow Diagram, Sankey Patient Flow

### 🤖 AI-Powered Analysis
- Upload PDF, Excel, or CSV documents
- Automatic data extraction using OpenAI GPT-4.1
- Multi-chart generation (4-6 charts per document)
- Statistical insights and quality assessment

### 🎨 Customization
- 7 publication-quality color palettes, including grayscale and colorblind-safe sets
- Schema-driven axis, gridline, reference line, shaded region, and annotation controls
- Per-series overrides for color, stroke width, confidence intervals, and trend lines
- Typography presets for titles, captions, legends, and axis text
- Customizable labels, legends, and backgrounds
- Dark mode support
- Table formatting options

### 📤 Export Options
- **PNG** – 300–1200 DPI raster export with single/1.5/double-column presets
- **TIFF** – Journal-ready TIFF with configurable DPI and size presets
- **SVG** – Vector graphics for downstream editing
- **PDF** – Multi-page documents
- **PowerPoint** – Editable presentations

#### Journal-ready controls
- **Resolution**: Choose 300, 600, 900, or 1200 DPI before exporting
- **Figure width presets**: Single column (85 mm), 1.5 column (120 mm), double column (170 mm), or custom width/height (capped at 230 mm tall)
- **Typography presets**: Helvetica/Arial or Times-aligned presets per journal (`Settings → Typography`)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/mnikor/MediInsightViz.git
cd MediInsightViz

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### Environment Variables

Create a `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
SESSION_SECRET=your_random_secret_here
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5000`

### Production Build

```bash
npm run build
npm start
```

## 📖 Usage

1. **Upload Document**: Click "Upload Medical Document" and select a PDF, Excel, or CSV file
2. **Select Chart Type**: Choose from 15+ chart types or let AI auto-detect
3. **Add Context** (optional): Describe what you want to visualize
4. **Generate Charts**: AI analyzes your document and creates publication-ready charts
5. **Customize**: Adjust colors, labels, legends, and formatting
6. **Export**: Download as PNG, SVG, PDF, or PowerPoint

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast builds
- **TanStack Query** for data fetching
- **Shadcn/ui** + Radix UI components
- **Recharts** for visualizations
- **Tailwind CSS** for styling

### Backend
- **Express.js** with TypeScript
- **OpenAI API** integration
- **Multer** for file uploads
- **pdf-parse**, **xlsx**, **csv-parse** for document processing

### Storage
- In-memory storage (session-only)
- Database-ready with Drizzle ORM + PostgreSQL

## 📁 Project Structure

```
MediInsightViz/
├── client/src/          # Frontend React application
│   ├── components/      # React components
│   ├── pages/          # Page components
│   └── lib/            # Utilities
├── server/             # Backend Express application
│   ├── services/       # Business logic
│   └── routes.ts       # API endpoints
├── shared/             # Shared TypeScript types
└── attached_assets/    # Uploaded files
```

## 🔧 Technology Stack

- **Frontend**: React, TypeScript, Vite, TanStack Query, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **AI**: OpenAI GPT-4.1
- **Charts**: Recharts
- **UI**: Radix UI + Shadcn/ui
- **Forms**: React Hook Form + Zod
- **Export**: html2canvas, jsPDF, PptxGenJS

## 📊 Chart Types

### Basic Charts
- Bar Chart, Line Chart, Area Chart, Pie Chart

### Medical-Specific
- Demographics (age/gender distribution)
- Survival (treatment vs placebo)
- Efficacy (treatment outcomes)

### Advanced Medical
- **Forest Plot** - Meta-analysis with effect sizes
- **Kaplan-Meier** - Survival curves with censoring
- **Waterfall Plot** - Tumor response visualization
- **Swimmer Plot** - Treatment timelines
- **Box Plot** - Statistical distributions
- **Scatter Plot** - Correlation with regression
- **Heatmap** - Correlation matrices

### Study Schemas
- Study Design Timeline
- CONSORT Flow Diagram (1-10 arms)
- Sankey Patient Flow (unlimited arms)

## 🎨 Color Palettes

- **Default** - Professional blue/green/amber
- **Johnson & Johnson** - Corporate red branding
- **Nature Publishing** - Journal-standard colors
- **NEJM** - Medical journal palette
- **Vibrant** - High-contrast presentation colors

## 🔒 Security

- File type validation (PDF, Excel, CSV only)
- 10MB file size limit
- MIME type checking
- Environment variable protection
- No data persistence (session-only)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4o-mini API
- Recharts for visualization library
- Shadcn/ui for component system
- Radix UI for accessible primitives

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Contact: [your-email@example.com]

## 🗺️ Roadmap

- [ ] User authentication
- [ ] Database persistence
- [ ] "From Existing Data" feature
- [ ] Chart templates library
- [ ] Batch document processing
- [ ] Real-time collaboration
- [ ] Version history

---

**Built with ❤️ for the medical research community**

## 🎯 Advanced Styling Controls

- **Axis configuration**: `axis.x` / `axis.y` let you set numeric domains, log scales, and axis labels.
- **Gridlines**: `gridLines` toggles horizontal/vertical visibility and dashed rendering.
- **Reference overlays**: `referenceLines`, `shadedRegions`, and `annotations` render guide lines, highlighted bands, and labeled callouts.
- **Series overrides**: `seriesOverrides` allows per-key color, stroke width, confidence interval visibility, and automatic trend lines.
- **Typography presets**: `typographyPreset` applies publication-ready fonts and sizes while captions/figure numbers support italic styles and source attribution.

## ✅ Testing

- Install project dependencies: `npm install`
- Run the client test suite with Vitest: `npm run test`
- Launch the interactive test UI: `npm run test:ui`
- Tests use JSDOM with custom polyfills configured in `client/src/__tests__/setupTests.ts` and fixtures defined in `client/src/__tests__/fixtures/chartFixtures.ts`.
