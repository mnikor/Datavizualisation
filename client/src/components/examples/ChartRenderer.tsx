import ChartRenderer from '../ChartRenderer';

export default function ChartRendererExample() {
  const data = [
    { ageGroup: '18-30', male: 45, female: 52 },
    { ageGroup: '31-45', male: 78, female: 85 },
    { ageGroup: '46-60', male: 92, female: 88 },
    { ageGroup: '61-75', male: 67, female: 71 },
    { ageGroup: '76+', male: 34, female: 38 }
  ];

  return (
    <ChartRenderer
      type="demographics"
      data={data}
      colors={['#3b82f6', '#ec4899']}
      showLabels={true}
      showLegend={true}
      transparentBg={false}
    />
  );
}
