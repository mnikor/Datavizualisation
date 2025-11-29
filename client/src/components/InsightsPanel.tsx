import { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InsightsPanelProps {
  title: string;
  points: string[];
  defaultOpen?: boolean;
}

export default function InsightsPanel({ title, points, defaultOpen = true }: InsightsPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border mt-4">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between p-4 h-auto hover-elevate"
        data-testid="button-toggle-insights"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      
      {isOpen && (
        <div className="bg-primary/5 p-4 animate-fade-in" data-testid="panel-insights-content">
          <ul className="space-y-2">
            {points.map((point, idx) => (
              <li key={idx} className="flex gap-2 text-sm">
                <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
