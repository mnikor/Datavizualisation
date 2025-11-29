import { useState } from 'react';
import { Upload, X, FileText, FileUp, FileSearch, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface UploadModalProps {
  onClose: () => void;
  onUpload: (data: { file: File; chartType: string; description: string }) => void;
  isProcessing?: boolean;
  progress?: number;
  stage?: 'idle' | 'uploading' | 'analyzing' | 'finishing' | 'error';
  errorMessage?: string | null;
}

const CHART_TYPES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'table', label: 'Data Table' },
  { value: 'study-schema', label: 'Study Schema' },
  { value: 'sankey', label: 'Sankey Diagram (Patient Flow)' },
  { value: 'forest-plot', label: 'Forest Plot (Meta-analysis)' },
  { value: 'kaplan-meier', label: 'Kaplan-Meier Curve' },
  { value: 'waterfall', label: 'Waterfall Plot (Tumor Response)' },
  { value: 'swimmer', label: 'Swimmer Plot (Treatment Timeline)' },
  { value: 'box-plot', label: 'Box Plot (Distribution)' },
  { value: 'scatter', label: 'Scatter Plot (Correlation)' },
  { value: 'heatmap', label: 'Heatmap (Correlation Matrix)' }
];

const STAGE_COPY: Record<NonNullable<UploadModalProps['stage']>, { title: string; helper: string }> = {
  idle: { title: '', helper: '' },
  uploading: {
    title: 'Uploading document…',
    helper: 'Securely sending your file to the AI engine.',
  },
  analyzing: {
    title: 'Analyzing content…',
    helper: 'Extracting tables, metrics, and narratives to design charts.',
  },
  finishing: {
    title: 'Finishing up…',
    helper: 'Polishing visual layouts and preparing your dashboard.',
  },
  error: {
    title: 'Upload failed',
    helper: 'Please review the error message below and try again.',
  },
};

export default function UploadModal({
  onClose,
  onUpload,
  isProcessing: externalProcessing = false,
  progress = 0,
  stage = 'idle',
  errorMessage,
}: UploadModalProps) {
  const [mode, setMode] = useState<'upload' | 'existing'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [chartType, setChartType] = useState('auto');
  const [description, setDescription] = useState('');

  const isProcessing = externalProcessing;
  const progressValue = Math.min(Math.max(Math.round(progress), 0), 100);
  const showProgress = stage !== 'idle' && stage !== 'error' && isProcessing;
  const disableInputs = isProcessing;
  const stageCopy = STAGE_COPY[stage];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (isProcessing) {
      return;
    }
    if (mode === 'upload') {
      if (!file) {
        alert('Please upload a file');
        return;
      }
      onUpload({ file, chartType, description });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="modal-upload">
      <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Add New Chart</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
            data-testid="button-close-modal"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          {showProgress && (
            <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm font-medium text-primary mb-2">
                <span>{stageCopy.title}</span>
                <span>{progressValue}%</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/15">
                <div
                  className="absolute inset-y-0 left-0 bg-primary transition-all"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{stageCopy.helper}</p>
            </div>
          )}

          {stage === 'error' && errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{stageCopy.title}</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Tabs
            value={mode}
            onValueChange={(v) => {
              if (!disableInputs) {
                setMode(v as 'upload' | 'existing');
              }
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="upload" className="flex items-center gap-2" disabled={disableInputs}>
                <FileUp className="h-4 w-4" />
                Upload New Document
              </TabsTrigger>
              <TabsTrigger value="existing" className="flex items-center gap-2" disabled={disableInputs}>
                <FileSearch className="h-4 w-4" />
                From Existing Data
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6 mt-0">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload File</Label>
                <div
                  className={`border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors ${disableInputs
                    ? 'cursor-not-allowed opacity-70'
                    : 'cursor-pointer hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  onClick={() => {
                    if (!disableInputs) {
                      document.getElementById('file-upload')?.click();
                    }
                  }}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-primary" />
                      <span className="text-sm font-medium">{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, Excel (.xlsx), or CSV files
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.xlsx,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-file-upload"
                  disabled={disableInputs}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chart-type">Chart Type</Label>
                <Select value={chartType} onValueChange={setChartType} disabled={disableInputs}>
                  <SelectTrigger id="chart-type" data-testid="select-chart-type" disabled={disableInputs}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Optionally describe what you want to visualize. If left blank, AI will intelligently analyze and create appropriate charts."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  data-testid="textarea-description"
                  disabled={disableInputs}
                />
              </div>
            </TabsContent>

            <TabsContent value="existing" className="space-y-6 mt-0">
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Coming Soon:</strong> This feature will let you create additional charts from previously uploaded documents without re-uploading. Currently in development - please use "Upload New Document" to create charts.
                </AlertDescription>
              </Alert>

              <div className="space-y-2 opacity-50 pointer-events-none">
                <Label htmlFor="chart-type-existing">Chart Type</Label>
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger id="chart-type-existing" data-testid="select-chart-type-existing" disabled>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_TYPES.filter(t => t.value !== 'auto').map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 opacity-50 pointer-events-none">
                <Label htmlFor="description-existing">Description</Label>
                <Textarea
                  id="description-existing"
                  placeholder="Describe what you want to visualize from the existing data"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  data-testid="textarea-description-existing"
                  disabled
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex gap-3 p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            data-testid="button-create-chart"
            disabled={mode === 'existing' || disableInputs || (!file && mode === 'upload')}
          >
            {mode === 'existing'
              ? 'Coming Soon'
              : disableInputs
                ? stage === 'uploading'
                  ? 'Uploading…'
                  : stage === 'analyzing'
                    ? 'Analyzing…'
                    : 'Finalizing…'
                : 'Create Chart'}
          </Button>
        </div>
      </div>
    </div>
  );
}
