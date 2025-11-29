# Medical Publication Visualization Dashboard - Design Guidelines

## Design Approach: Professional Data Visualization System
**Selected Framework:** Material Design principles adapted for medical/scientific publishing with precision data visualization
**Rationale:** Utility-focused dashboard requiring trust, clarity, and publication-ready output quality

## Core Design Principles
1. **Scientific Precision:** Every visual element serves data clarity and statistical accuracy
2. **Publication Quality:** All outputs must meet peer-reviewed journal standards (Nature, NEJM, JAMA)
3. **Professional Trust:** Clean, authoritative interface for medical researchers and clinicians
4. **Efficient Workflow:** Minimize clicks from upload to publication-ready chart export

## Color Palette

### Interface Colors (Light Mode Primary)
- **Background Primary:** 249 250 251 (neutral gray for reduced eye strain)
- **Background Secondary:** 255 255 255 (card surfaces)
- **Text Primary:** 17 24 39 (high contrast for data readability)
- **Text Secondary:** 107 114 128
- **Border/Divider:** 229 231 235
- **Interactive Primary:** 59 130 246 (blue - trustworthy, medical standard)
- **Interactive Hover:** 37 99 235
- **Success/Positive:** 16 185 129 (data validation, treatment efficacy)
- **Warning/Caution:** 245 158 11 (data quality alerts)
- **Error/Critical:** 239 68 68 (insufficient data, validation errors)

### Chart Color Palettes (Pre-configured)
**Default Palette:** 59 130 246 / 236 72 153 / 16 185 129 / 245 158 11 / 139 92 246 / 239 68 68

**Johnson & Johnson:** 200 16 46 / 0 68 124 / 113 168 96 / 245 130 32 / 107 44 145 / 253 185 19

**Nature Publishing:** 230 75 53 / 77 187 213 / 0 160 135 / 60 84 136 / 243 155 127 / 132 145 180

**NEJM Style:** 188 60 41 / 0 114 181 / 225 135 39 / 32 133 78 / 120 118 177 / 111 153 173

**Vibrant:** 255 107 107 / 78 205 196 / 69 183 209 / 255 160 122 / 152 216 200 / 247 220 111

### Dark Mode (Medical Night Reading)
- **Background Primary:** 17 24 39
- **Background Secondary:** 31 41 55
- **Text Primary:** 243 244 246
- **Text Secondary:** 156 163 175
- **Border/Divider:** 55 65 81

## Typography

### Font Stack
- **Primary Font:** Inter (via Google Fonts CDN) - modern, highly legible for data-dense interfaces
- **Monospace/Data:** 'JetBrains Mono' - for statistical values, p-values, confidence intervals

### Type Scale
- **Display/Headers:** text-2xl to text-3xl, font-semibold (600) - Chart titles, modal headers
- **Body/Data Labels:** text-sm to text-base, font-medium (500) - Chart axis labels, data values  
- **Captions/Meta:** text-xs to text-sm, font-normal (400) - Timestamps, file names, footnotes
- **Statistical Values:** text-base, font-mono, font-semibold - p-values, HR, CI values in insights

## Layout System

### Spacing Primitives (Tailwind Units)
- **Core spacing set:** 2, 4, 6, 8, 12, 16 (use consistently: p-4, gap-6, mt-8)
- **Card padding:** p-6 (consistent across all chart cards)
- **Section spacing:** space-y-8 (between major dashboard sections)
- **Button/Input padding:** px-4 py-2 (standard touch targets)

### Grid System
- **Dashboard Layout:** CSS Grid with 1-2 column responsive (grid-cols-1 lg:grid-cols-2)
- **Chart Cards:** Auto-fit grid for 1-3 charts per row based on viewport
- **Settings Panel:** Fixed 320px width sidebar overlay on mobile/tablet

### Container Strategy
- **Main Container:** max-w-7xl mx-auto px-4 - centers dashboard content
- **Chart Card:** Full width within grid cell with min-h-[500px]
- **Modal Dialogs:** max-w-2xl for settings, max-w-4xl for data tables

## Component Library

### Primary Components

**Chart Card Container:**
- White background with subtle shadow (shadow-sm hover:shadow-md transition)
- Rounded corners (rounded-lg)
- Border (border border-gray-200)
- Header with title (text-lg font-semibold), settings icon, delete icon
- Chart area (300-350px height for most charts, 400px for survival curves)
- Footer with key message callout and insights toggle

**Action Buttons:**
- Primary: Blue fill (bg-blue-600 hover:bg-blue-700) with white text
- Secondary: White with border (border-gray-300 hover:bg-gray-50)
- Danger: Red outline (border-red-300 text-red-600 hover:bg-red-50)
- Icon-only: Ghost style (hover:bg-gray-100 rounded-md p-2)

**Upload Zone:**
- Dashed border (border-2 border-dashed border-gray-300)
- Hover state: border-blue-400 bg-blue-50
- Large dropzone: min-h-[200px] with centered upload icon and text
- Supported formats badge: PDF, XLSX, CSV

**Insights Panel (Expandable):**
- Collapsible section below each chart
- Light blue background (bg-blue-50)
- Bullet points with checkmark icons
- Statistical annotations (p-values, CI, HR) in monospace bold

**Settings Modal:**
- Overlay backdrop (bg-black/50)
- White modal card (max-w-2xl) with close button
- Tabbed sections: Display Options, Color Palette, Data Table
- Toggle switches for Show Labels, Show Legend, Transparent Background
- Live preview of chart with settings applied

**Data Quality Warnings:**
- Yellow warning banner (bg-yellow-50 border-l-4 border-yellow-400)
- Icon + descriptive text explaining data insufficiency
- "Request Additional Data" action button
- Alternative analysis suggestions

### Navigation & Controls

**Top Control Bar:**
- Export format selector (PNG/SVG/PDF radio buttons)
- "Add Chart" dropdown menu with predefined templates
- "Custom Chart" button (primary blue)
- Settings gear icon (global preferences)

**Chart Template Menu:**
- Demographics, Survival Analysis, Efficacy, Biomarker Analysis options
- Each with small preview icon and description
- Hover state with expanded description

## Data Visualization Standards

### Chart Aesthetics
- **Grid Lines:** Subtle gray (stroke="#e5e7eb") with 3-3 dash pattern
- **Axes:** Dark gray labels (#374151) with 12px font size, medium weight
- **Tooltips:** White background, thin border, rounded corners, 12px text
- **Legend:** Bottom position for bar/line charts, right for pie charts
- **Data Points:** 4-6px radius for scatter plots, 2px stroke for lines
- **Error Bars:** 1px stroke with caps (when applicable for confidence intervals)

### Chart-Specific Guidelines

**Survival Curves (Kaplan-Meier):**
- Area charts with 30% opacity fills
- Step function for true survival data representation
- Risk table below x-axis (number at risk per time point)
- Median survival dotted line annotations

**Demographics (Bar Charts):**
- Grouped bars with 8px gap between groups
- Male/Female gender colors from selected palette (positions 0 and 1)
- Age group labels on x-axis, patient count on y-axis

**Efficacy (Line Charts):**
- Treatment vs Placebo with distinct colors (palette positions 0 and 1)
- Confidence interval shaded areas (20% opacity)
- Statistical significance markers at separation points

**Custom Charts:**
- AI-detected chart type badge in top-right
- "Analyzing data..." loading state with skeleton
- Data structure preview table before chart generation

### Export Quality Settings
- **PNG:** 300 DPI for print, 150 DPI for digital
- **SVG:** Vector with embedded fonts, optimized paths
- **PDF:** Print-ready with CMYK color space option
- **Transparent Background:** Remove white fill, preserve chart elements
- **Dimension Options:** Standard (800x600), Large (1200x800), Custom input

## Interactions & Animations

### Micro-interactions (Minimal)
- Card hover: Subtle shadow elevation (150ms ease transition)
- Button hover: Background color shift (100ms)
- Toggle switches: Smooth slide animation (200ms)
- Chart loading: Gentle fade-in (300ms) - no skeleton loaders for charts
- Modal entry: Fade + slight scale (250ms ease-out)

### Data Updates
- Chart re-render: Cross-fade transition (400ms) when data/settings change
- Insight panel expand/collapse: Smooth height transition (300ms)
- No animations during data editing to prevent confusion

## Responsive Behavior

### Breakpoints
- **Mobile (< 768px):** Single column, stacked charts, bottom sheet modals
- **Tablet (768px - 1024px):** 1-2 column grid, side panel for settings
- **Desktop (> 1024px):** 2-3 column grid, overlay modals, full feature set

### Mobile Adaptations
- Chart height: Reduce to 250px on mobile
- Touch-friendly controls: Minimum 44px tap targets
- Simplified chart legends: Move to bottom, horizontal layout
- Export menu: Bottom sheet instead of dropdown
- Data table: Horizontal scroll with sticky first column

## Accessibility Requirements

### Contrast & Readability
- All text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- Chart colors pass accessibility checks when used together
- Focus indicators: 2px blue ring (ring-2 ring-blue-500)
- Error states: Icon + color + text (not color alone)

### Screen Reader Support
- Chart data tables accessible as fallback
- Semantic HTML: `<button>`, `<nav>`, `<main>`, `<section>` with ARIA labels
- Modal focus trap with Escape key dismiss
- Statistical insights readable in linear order

### Dark Mode Consistency
- All form inputs have dark backgrounds (bg-gray-700)
- Chart backgrounds adapt: white in light mode, dark gray in dark mode (unless transparent override)
- Maintain chart color palette consistency across modes

## Images & Illustrations
**No hero images required** - this is a pure utility dashboard. Focus on data visualization excellence.

**Icon Usage:**
- Lucide React icons throughout (consistent stroke width: 2px)
- Download, Plus, Trash2, RefreshCw, Info, Settings, X, Check, MessageSquare, Palette
- Chart type icons in template menu (custom or from icon set)