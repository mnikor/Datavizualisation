import ChartCard from '../ChartCard';

export default function ChartCardExample() {
  const mockChart = {
    id: 1,
    type: 'demographics',
    title: 'Patient Demographics by Age and Gender',
    showLabels: true,
    showLegend: true,
    palette: 'default' as const,
    transparentBg: false,
    keyMessage: 'Balanced enrollment across age groups with slight female predominance',
    data: [
      { ageGroup: '18-30', male: 45, female: 52 },
      { ageGroup: '31-45', male: 78, female: 85 },
      { ageGroup: '46-60', male: 92, female: 88 },
      { ageGroup: '61-75', male: 67, female: 71 },
      { ageGroup: '76+', male: 34, female: 38 }
    ],
    hasData: true,
    insights: {
      title: 'Demographics Analysis',
      points: [
        'Balanced gender distribution across all age groups (±10%)',
        'Highest enrollment in 46-60 age group (n=180)',
        'Represents typical patient population for this indication',
        'Meets FDA diversity guidelines for Phase III trials'
      ]
    }
  };

  return (
    <ChartCard
      chart={mockChart}
      onSettings={() => console.log('Settings clicked')}
      onDelete={() => console.log('Delete clicked')}
      onExport={() => console.log('Export clicked')}
    />
  );
}
