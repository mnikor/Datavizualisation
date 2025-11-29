import { render, screen, waitFor } from '@testing-library/react';
import ChartRenderer from '@/components/ChartRenderer';
import { chartRendererProps, baseColors } from './fixtures/chartFixtures';
import { typographyPresets } from '@/lib/typographyPresets';

const renderWithContainer = (ui: React.ReactNode) =>
  render(<div style={{ width: 900, height: 600 }}>{ui}</div>);

describe('ChartRenderer', () => {
  const baseProps = {
    ...chartRendererProps,
    typography: typographyPresets.default,
  };

  it('renders axis labels, reference elements, and annotations', async () => {
    const { container } = renderWithContainer(<ChartRenderer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Response (%)')).toBeInTheDocument();
      expect(screen.getByText('Week')).toBeInTheDocument();
    });

    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText('Milestone')).toBeInTheDocument();

    const shadedRegion = container.querySelector('rect[fill="#2563eb"]');
    expect(shadedRegion).not.toBeNull();

    const dashedGridLines = container.querySelectorAll('line[stroke-dasharray="3 3"]');
    expect(dashedGridLines.length).toBeGreaterThan(0);
  });

  it('applies series overrides for color, confidence interval, and trend line', async () => {
    const { container } = renderWithContainer(<ChartRenderer {...baseProps} />);

    await waitFor(() => {
      const treatmentSeries = container.querySelector(`path[stroke="${baseColors[1]}"]`);
      expect(treatmentSeries).not.toBeNull();
    });

    const confidenceIntervalLines = container.querySelectorAll('path[stroke-dasharray="5 5"]');
    expect(confidenceIntervalLines.length).toBeGreaterThanOrEqual(2);

    const trendLine = container.querySelector('path[stroke-dasharray="4 4"]');
    expect(trendLine).not.toBeNull();
  });
});
