import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, Moon, Sun, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import ChartCard from '@/components/ChartCard';
import UploadModal from '@/components/UploadModal';
import SettingsModal from '@/components/SettingsModal';
import FullScreenChartModal, { ChartFullViewContent } from '@/components/FullScreenChartModal';
import type { Chart } from '@shared/schema';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import pptxgen from 'pptxgenjs';
import { createRoot } from 'react-dom/client';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const waitForSvgElement = async (root: HTMLElement, attempts = 10, delay = 100): Promise<SVGSVGElement | null> => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const svgCandidates = Array.from(root.querySelectorAll('svg')) as SVGSVGElement[];
    const svg = svgCandidates
      .map((node) => ({
        node,
        rect: node.getBoundingClientRect(),
      }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0)
      .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)[0]?.node;

    if (svg) {
      return svg;
    }
    await sleep(delay);
  }
  return null;
};

const INLINE_ATTRS: Array<{ attr: string; cssProperty: string }> = [
  { attr: 'fill', cssProperty: 'fill' },
  { attr: 'stroke', cssProperty: 'stroke' },
  { attr: 'stop-color', cssProperty: 'stop-color' },
  { attr: 'color', cssProperty: 'color' },
];

const inlineComputedStyles = (source: SVGElement, target: SVGElement) => {
  const queue: Array<{ src: Element; tgt: Element }> = [{ src: source, tgt: target }];

  while (queue.length) {
    const { src, tgt } = queue.shift()!;
    if (!(src instanceof SVGElement) || !(tgt instanceof SVGElement)) continue;

    const computed = window.getComputedStyle(src);

    INLINE_ATTRS.forEach(({ attr, cssProperty }) => {
      const value = tgt.getAttribute(attr);
      if (value && (value.includes('var(') || value === 'currentColor')) {
        const computedValue = computed.getPropertyValue(cssProperty);
        if (computedValue) {
          tgt.setAttribute(attr, computedValue);
        }
      }
    });

    const styleAttr = tgt.getAttribute('style');
    if (styleAttr && styleAttr.includes('var(')) {
      const declarations = styleAttr
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((declaration) => {
          const [property, rawValue] = declaration.split(':').map((segment) => segment.trim());
          if (!property || !rawValue) return null;
          if (!rawValue.includes('var(') && rawValue !== 'currentColor') {
            return `${property}: ${rawValue}`;
          }
          const computedValue = computed.getPropertyValue(property);
          if (computedValue) {
            return `${property}: ${computedValue}`;
          }
          return null;
        })
        .filter(Boolean)
        .join('; ');

      if (declarations) {
        tgt.setAttribute('style', declarations);
      } else {
        tgt.removeAttribute('style');
      }
    }

    const srcChildren = Array.from(src.children);
    const tgtChildren = Array.from(tgt.children);
    const length = Math.min(srcChildren.length, tgtChildren.length);
    for (let index = 0; index < length; index++) {
      queue.push({ src: srcChildren[index], tgt: tgtChildren[index] });
    }
  }
};

const SVG_NS = 'http://www.w3.org/2000/svg';





const downloadBase64File = (base64: string, contentType: string, filename: string) => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let index = 0; index < byteCharacters.length; index += 1) {
    byteNumbers[index] = byteCharacters.charCodeAt(index);
  }

  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};

const buildSvgPayload = async (root: HTMLElement): Promise<{ svg: string; width: number; height: number } | null> => {
  let svgElement = await waitForSvgElement(root);

  if (!svgElement) {
    const tableSvg = root.querySelector('svg[data-table-export="true"]') as SVGSVGElement | null;
    if (tableSvg) {
      svgElement = tableSvg;
    }
  }

  if (!svgElement) {
    return null;
  }

  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  inlineComputedStyles(svgElement, clonedSvg);


  if (!clonedSvg.getAttribute('xmlns')) {
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!clonedSvg.getAttribute('xmlns:xlink')) {
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  const rect = svgElement.getBoundingClientRect();
  const viewBoxBase = svgElement.viewBox?.baseVal;
  const fallbackWidth = Number(svgElement.getAttribute('width')) || (viewBoxBase ? viewBoxBase.width : 0);
  const fallbackHeight = Number(svgElement.getAttribute('height')) || (viewBoxBase ? viewBoxBase.height : 0);
  const width = Math.max(1, Math.round(rect.width || fallbackWidth || 0));
  const height = Math.max(1, Math.round(rect.height || fallbackHeight || 0));

  if (width > 0 && height > 0) {
    clonedSvg.setAttribute('width', `${width}`);
    clonedSvg.setAttribute('height', `${height}`);
    if (!clonedSvg.getAttribute('viewBox')) {
      clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
  }

  const serialized = new XMLSerializer().serializeToString(clonedSvg);
  return { svg: serialized, width, height };
};

export default function Dashboard() {
  const [charts, setCharts] = useState<Chart[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingChart, setEditingChart] = useState<Chart | null>(null);
  const [fullViewChart, setFullViewChart] = useState<Chart | null>(null);
  const [exportFormat, setExportFormat] = useState('png');
  const [exportDpi, setExportDpi] = useState(300);
  const [exportSizePreset, setExportSizePreset] = useState<'custom' | 'single' | 'one-and-half' | 'double'>('single');
  const [exportCustomWidthMm, setExportCustomWidthMm] = useState(85);
  const [exportCustomHeightMm, setExportCustomHeightMm] = useState(120);
  const [includeInsights, setIncludeInsights] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState(false);
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'analyzing' | 'finishing' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast();

  const resetUploadUI = () => {
    setUploadStage('idle');
    setUploadProgress(0);
    setUploadError(null);
  };

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Extract values from formData to construct query params
      const chartType = formData.get('chartType') as string;
      const description = formData.get('description') as string;

      const params = new URLSearchParams();
      if (chartType) params.append('chartType', chartType);
      if (description) params.append('description', description);

      const response = await fetch(`/api/analyze-document?${params.toString()}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      setUploadStage('analyzing');
      setUploadProgress((prev) => (prev < 55 ? 55 : prev));

      return await response.json();
    },
    onMutate: () => {
      setUploadStage('uploading');
      setUploadProgress(20);
      setUploadError(null);
    },
    onSuccess: (data: Chart[]) => {
      setUploadStage('finishing');
      setUploadProgress(100);
      setCharts(prev => [...prev, ...data]);
      const chartCount = Array.isArray(data) ? data.length : 1;
      toast({
        title: 'Document analyzed',
        description: `${chartCount} chart${chartCount > 1 ? 's' : ''} generated successfully`
      });
      setTimeout(() => {
        setShowUploadModal(false);
        resetUploadUI();
      }, 400);
    },
    onError: (error: Error) => {
      setUploadStage('error');
      setUploadProgress(0);
      setUploadError(error.message);
      toast({
        title: 'Analysis failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const deleteChart = (id: number) => {
    setCharts(prev => prev.filter(chart => chart.id !== id));
    toast({
      title: 'Chart deleted',
      description: 'Chart has been removed successfully'
    });
  };

  const updateChart = (id: number, settings: any) => {
    setCharts(prev => prev.map(chart =>
      chart.id === id ? { ...chart, ...settings } : chart
    ));
    toast({
      title: 'Chart updated',
      description: 'Settings saved successfully'
    });
    setEditingChart(null);
  };

  const handleUpload = async (data: { file: File; chartType: string; description: string }) => {
    const formData = new FormData();
    formData.append('chartType', data.chartType);
    formData.append('description', data.description);
    formData.append('file', data.file);

    uploadMutation.mutate(formData);
  };

  const handleOpenUploadModal = () => {
    resetUploadUI();
    uploadMutation.reset();
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    resetUploadUI();
    uploadMutation.reset();
  };

  const uploadIsProcessing = uploadStage === 'uploading' || uploadStage === 'analyzing' || uploadStage === 'finishing';

  const renderFullViewForExport = async (chart: Chart) => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '1200px';
    wrapper.style.padding = '40px';
    wrapper.style.backgroundColor = chart.transparentBg ? 'transparent' : '#ffffff';
    document.body.appendChild(wrapper);

    const root = createRoot(wrapper);
    root.render(
      <div
        data-testid="export-container"
        style={{
          padding: '60px',
          backgroundColor: chart.transparentBg ? 'transparent' : '#ffffff',
          width: '100%',
          height: '100%'
        }}
      >
        <ChartFullViewContent chart={chart} showInsights={includeInsights} />
      </div>
    );

    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

    const element = wrapper.querySelector('[data-testid="export-container"]') as HTMLElement | null;
    if (!element) {
      root.unmount();
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
      throw new Error('Unable to render chart for export');
    }

    return {
      element,
      cleanup: () => {
        root.unmount();
        if (document.body.contains(wrapper)) {
          document.body.removeChild(wrapper);
        }
      }
    };
  };

  const exportChart = async (chart: Chart) => {
    let cleanup: (() => void) | undefined;

    try {
      const prepared = await renderFullViewForExport(chart);
      const { element: elementToCapture } = prepared;
      cleanup = prepared.cleanup;

      if (exportFormat === 'svg') {
        let svgElement = await waitForSvgElement(elementToCapture);

        if (!svgElement) {
          // Try to locate an inline table SVG fallback
          const tableSvg = elementToCapture.querySelector('svg[data-table-export="true"]') as SVGSVGElement | null;
          if (tableSvg) {
            const inlineClone = tableSvg.cloneNode(true) as SVGSVGElement;
            inlineComputedStyles(tableSvg, inlineClone);
            svgElement = inlineClone;
          }
        }

        if (!svgElement) {
          toast({
            title: 'SVG not available',
            description: 'Unable to prepare an SVG for this chart. Please try again or export as PNG, PDF, or PPT.',
            variant: 'destructive'
          });

          return;
        }

        const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
        inlineComputedStyles(svgElement, clonedSvg);


        if (!clonedSvg.getAttribute('xmlns')) {
          clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        if (!clonedSvg.getAttribute('xmlns:xlink')) {
          clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        }

        const { width, height } = svgElement.getBoundingClientRect();
        if (width > 0 && height > 0) {
          clonedSvg.setAttribute('width', `${Math.round(width)}`);
          clonedSvg.setAttribute('height', `${Math.round(height)}`);
          if (!clonedSvg.getAttribute('viewBox')) {
            clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
          }
        }

        const svgData = new XMLSerializer().serializeToString(clonedSvg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const link = document.createElement('a');
        link.download = `${chart.title.replace(/\s+/g, '_')}.svg`;
        link.href = svgUrl;
        link.click();

        URL.revokeObjectURL(svgUrl);

        toast({
          title: 'Export complete',
          description: `Chart exported as SVG`
        });
        return;
      }

      if ((exportFormat === 'png' || exportFormat === 'tiff') && !includeInsights) {
        const payload = await buildSvgPayload(elementToCapture);

        if (!payload) {
          toast({
            title: 'SVG not available',
            description: 'Unable to prepare an SVG for this chart. Please try exporting as SVG or PDF.',
            variant: 'destructive'
          });
          return;
        }

        // Inject white background if transparency is disabled
        let svgContent = payload.svg;
        if (!chart.transparentBg) {
          // Check if viewBox exists to determine rect size
          const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
          let width = '100%';
          let height = '100%';

          if (viewBoxMatch) {
            const [, viewBox] = viewBoxMatch;
            const parts = viewBox.split(/\s+/);
            if (parts.length === 4) {
              width = parts[2];
              height = parts[3];
            }
          }

          // Insert rect after the opening svg tag
          const rect = `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`;
          svgContent = svgContent.replace(/(<svg[^>]*>)/, `$1${rect}`);
        }

        const sizePresetToMm: Record<typeof exportSizePreset, { width: number; height: number }> = {
          single: { width: 85, height: Math.min(exportCustomHeightMm, 230) },
          'one-and-half': { width: 120, height: Math.min(exportCustomHeightMm, 230) },
          double: { width: 170, height: Math.min(exportCustomHeightMm, 230) },
          custom: { width: exportCustomWidthMm, height: exportCustomHeightMm },
        };

        const chosenSize = sizePresetToMm[exportSizePreset];

        const response = await fetch('/api/export-chart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            svg: svgContent,
            format: exportFormat,
            title: chart.title,
            dpi: exportDpi,
            widthMm: chosenSize.width,
            heightMm: chosenSize.height,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Export request failed');
        }

        const result = await response.json();
        if (!result?.data) {
          throw new Error('Export response was missing data');
        }

        const fallbackExtension = exportFormat === 'tiff' ? 'tiff' : 'png';
        const fallbackContentType = exportFormat === 'tiff' ? 'image/tiff' : 'image/png';
        const filename = result.suggestedName || `${chart.title.replace(/\s+/g, '_')}.${fallbackExtension}`;
        downloadBase64File(result.data, result.contentType || fallbackContentType, filename);

        toast({
          title: 'Export complete',
          description: `Chart exported as ${exportFormat.toUpperCase()} (${result.dpi ?? exportDpi} DPI)`
        });
        return;
      }

      const canvas = await html2canvas(elementToCapture, {
        backgroundColor: chart.transparentBg ? null : '#ffffff',
        scale: 2,
        logging: false,
      });

      if (exportFormat === 'png') {
        const link = document.createElement('a');
        link.download = `${chart.title.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        toast({
          title: 'Export complete',
          description: `Chart exported as PNG`
        });
      } else if (exportFormat === 'pdf') {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${chart.title.replace(/\s+/g, '_')}.pdf`);

        toast({
          title: 'Export complete',
          description: `Chart exported as PDF`
        });
      } else if (exportFormat === 'ppt') {
        const pptx = new pptxgen();
        const slide = pptx.addSlide();

        slide.addText(chart.title, {
          x: 0.5,
          y: 0.3,
          fontSize: 24,
          bold: true,
          color: '363636'
        });

        slide.addText(chart.keyMessage, {
          x: 0.5,
          y: 0.9,
          w: 9,
          fontSize: 12,
          color: '666666'
        });

        // Always use canvas image for PPT to ensure chart is exported
        const imgData = canvas.toDataURL('image/png');
        slide.addImage({
          data: imgData,
          x: 0.5,
          y: 1.5,
          w: 9,
          h: 5
        });

        if (chart.insights) {
          const insightsSlide = pptx.addSlide();

          insightsSlide.addText(chart.insights.title, {
            x: 0.5,
            y: 0.3,
            fontSize: 20,
            bold: true,
            color: '363636'
          });

          chart.insights.points.forEach((point, index) => {
            insightsSlide.addText(`• ${point}`, {
              x: 0.8,
              y: 1.2 + (index * 0.5),
              w: 8.5,
              fontSize: 12,
              color: '666666'
            });
          });
        }

        await pptx.writeFile({ fileName: `${chart.title.replace(/\s+/g, '_')}.pptx` });

        toast({
          title: 'Export complete',
          description: `Chart exported as PowerPoint`
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unable to export chart',
        variant: 'destructive'
      });
    } finally {
      cleanup?.();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
                Medical Publication Visualization
              </h1>
              <p className="text-sm text-muted-foreground mt-1">AI-Powered Clinical Data Dashboard</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleDarkMode}
              data-testid="button-theme-toggle"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Export Format:</Label>
            <RadioGroup value={exportFormat} onValueChange={setExportFormat} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="png" id="png" data-testid="radio-png" />
                <Label htmlFor="png" className="text-sm cursor-pointer">PNG</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="svg" id="svg" data-testid="radio-svg" />
                <Label htmlFor="svg" className="text-sm cursor-pointer">SVG</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" data-testid="radio-pdf" />
                <Label htmlFor="pdf" className="text-sm cursor-pointer">PDF</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ppt" id="ppt" data-testid="radio-ppt" />
                <Label htmlFor="ppt" className="text-sm cursor-pointer">PPT</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tiff" id="tiff" data-testid="radio-tiff" />
                <Label htmlFor="tiff" className="text-sm cursor-pointer">TIFF</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="include-insights"
              checked={includeInsights}
              onCheckedChange={(checked) => setIncludeInsights(checked as boolean)}
            />
            <Label htmlFor="include-insights" className="text-sm cursor-pointer font-medium">Include AI Insights</Label>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium" htmlFor="select-dpi">Resolution:</Label>
            <RadioGroup value={String(exportDpi)} onValueChange={(value) => setExportDpi(Number(value))} className="flex gap-3">
              {[300, 600, 900, 1200].map((dpiOption) => (
                <div key={dpiOption} className="flex items-center space-x-2">
                  <RadioGroupItem value={String(dpiOption)} id={`dpi-${dpiOption}`} />
                  <Label htmlFor={`dpi-${dpiOption}`} className="text-sm cursor-pointer">{dpiOption} DPI</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-sm font-medium">Figure Width:</Label>
            <RadioGroup value={exportSizePreset} onValueChange={(value) => setExportSizePreset(value as typeof exportSizePreset)} className="flex gap-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="width-single" />
                <Label htmlFor="width-single" className="text-sm cursor-pointer">Single column (85 mm)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="one-and-half" id="width-one-half" />
                <Label htmlFor="width-one-half" className="text-sm cursor-pointer">1.5 column (120 mm)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="double" id="width-double" />
                <Label htmlFor="width-double" className="text-sm cursor-pointer">Double column (170 mm)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="width-custom" />
                <Label htmlFor="width-custom" className="text-sm cursor-pointer">Custom</Label>
              </div>
            </RadioGroup>

            {exportSizePreset === 'custom' && (
              <div className="flex items-center gap-2">
                <label className="text-sm" htmlFor="custom-width">Width (mm)</label>
                <input
                  id="custom-width"
                  type="number"
                  className="w-20 rounded border border-border bg-background px-2 py-1 text-sm"
                  min={40}
                  max={180}
                  value={exportCustomWidthMm}
                  onChange={(event) => setExportCustomWidthMm(Number(event.target.value))}
                />
                <label className="text-sm" htmlFor="custom-height">Height (mm)</label>
                <input
                  id="custom-height"
                  type="number"
                  className="w-20 rounded border border-border bg-background px-2 py-1 text-sm"
                  min={40}
                  max={230}
                  value={exportCustomHeightMm}
                  onChange={(event) => setExportCustomHeightMm(Number(event.target.value))}
                />
              </div>
            )}
          </div>
          <div className="ml-auto">
            <Button
              onClick={handleOpenUploadModal}
              data-testid="button-upload-document"
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Chart
                </>
              )}
            </Button>
          </div>
        </div>

        const [lastChartClick, setLastChartClick] = useState<{ x: number; y: number } | null>(null);

  const handleChartClick = (data: any) => {
    if (data?.points?.[0]) {
      const point = data.points[0];
        // Prefer x/y from point, fallback to other properties if needed
        // For categorical axes, x might be a string. For annotations, we usually need coordinates.
        // If x is a category, we might need the index or the string itself depending on axis type.
        // Plotly annotations work with data coordinates by default.
        setLastChartClick({x: point.x, y: point.y });
    }
  };

        return (
        <div className="min-h-screen bg-background">
          {/* ... header ... */}

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* ... toolbar ... */}

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2" data-testid="grid-charts">
              {charts.map((chart) => (
                <div key={chart.id} className={chart.type === 'study-schema' ? 'md:col-span-2' : ''}>
                  <ChartCard
                    chart={chart}
                    onSettings={() => setEditingChart(chart)}
                    onDelete={() => deleteChart(chart.id)}
                    onExport={() => exportChart(chart)}
                    onFullView={() => setFullViewChart(chart)}
                    onChartClick={handleChartClick}
                  />
                </div>
              ))}
            </section>

            {/* ... empty state ... */}
          </main>

          {/* ... modals ... */}

          {editingChart && (
            <SettingsModal
              chart={editingChart}
              onClose={() => setEditingChart(null)}
              onSave={(settings) => updateChart(editingChart.id, settings)}
              lastChartClick={lastChartClick}
            />
          )}
          {fullViewChart && (
            <FullScreenChartModal
              chart={fullViewChart}
              onClose={() => setFullViewChart(null)}
              onExport={async () => {
                await exportChart(fullViewChart);
              }}
              includeInsights={includeInsights}
              onToggleInsights={setIncludeInsights}
            />
          )}
        </div>
        );
}
