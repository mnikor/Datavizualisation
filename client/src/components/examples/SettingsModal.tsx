import { useState } from 'react';
import SettingsModal from '../SettingsModal';
import { Button } from '@/components/ui/button';

export default function SettingsModalExample() {
  const [isOpen, setIsOpen] = useState(true);

  const mockChart = {
    id: 1,
    title: 'Patient Demographics by Age and Gender',
    showLabels: true,
    showLegend: true,
    palette: 'default' as const,
    transparentBg: false,
    data: [{ ageGroup: '18-30', male: 45, female: 52 }]
  };

  if (!isOpen) {
    return <Button onClick={() => setIsOpen(true)}>Open Settings Modal</Button>;
  }

  return (
    <SettingsModal
      chart={mockChart}
      onClose={() => setIsOpen(false)}
      onSave={(settings) => {
        console.log('Saved:', settings);
        setIsOpen(false);
      }}
    />
  );
}
