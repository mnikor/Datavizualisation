import InsightsPanel from '../InsightsPanel';

export default function InsightsPanelExample() {
  return (
    <InsightsPanel
      title="Survival Analysis"
      points={[
        'Median OS: 21.3 months (treatment) vs 16.8 months (placebo)',
        'Hazard ratio: 0.68 (95% CI: 0.55-0.84, p=0.0003)',
        '24-month survival rate: 72% vs 45% favoring treatment',
        'Survival benefit consistent across follow-up period'
      ]}
    />
  );
}
