import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataQualityWarningProps {
  message: string;
}

export default function DataQualityWarning({ message }: DataQualityWarningProps) {
  return (
    <div className="bg-warning/10 border-l-4 border-warning p-4 rounded-md" data-testid="warning-data-quality">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground mb-1">Data Quality Warning</h4>
          <p className="text-sm text-muted-foreground mb-3">{message}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => console.log('Request additional data')}
              data-testid="button-request-data"
            >
              Request Additional Data
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => console.log('View alternative analysis')}
              data-testid="button-alternative-analysis"
            >
              View Alternatives
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
