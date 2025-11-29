import type { StudySchemaData, SchemaType } from '@shared/schema';
import Plot from 'react-plotly.js';

const SVG_LINE_HEIGHT = 16;

function wrapSvgText(text: string, maxCharacters: number): string[] {
  if (!text) {
    return [];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharacters) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function formatCount(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '-') {
      return '—';
    }
    // Remove commas and try to parse
    const numeric = Number(trimmed.replace(/,/g, ''));
    if (!Number.isNaN(numeric)) {
      return numeric.toLocaleString();
    }
    return trimmed;
  }

  return '—';
}

interface StudySchemaRendererProps {
  schemaData: StudySchemaData;
  schemaType: SchemaType;
  colors: readonly string[];
  transparentBg: boolean;
}

export default function StudySchemaRenderer({
  schemaData,
  schemaType,
  colors,
  transparentBg
}: StudySchemaRendererProps) {
  const bgColor = transparentBg ? 'transparent' : 'hsl(var(--card))';

  if (schemaType === 'consort') {
    return <ConsortFlow schemaData={schemaData} colors={colors} bgColor={bgColor} />;
  }

  if (schemaType === 'sankey') {
    return <SankeyDiagram schemaData={schemaData} colors={colors} bgColor={bgColor} />;
  }

  return <StudyDesignSchema schemaData={schemaData} colors={colors} bgColor={bgColor} />;
}

function ConsortFlow({
  schemaData,
  colors,
  bgColor,
}: {
  schemaData: StudySchemaData;
  colors: readonly string[];
  bgColor: string;
}) {
  const totalEnrolled = schemaData.totalEnrolled || 0;
  const arms = schemaData.arms || [];
  const orientation = schemaData.consortOrientation ?? 'vertical';

  if (arms.length === 0) {
    return (
      <div style={{ backgroundColor: bgColor }} className="p-6" data-testid="schema-consort">
        <div className="text-center text-muted-foreground">No study arms data available</div>
      </div>
    );
  }

  const armCount = arms.length;

  if (armCount > 10) {
    return (
      <div style={{ backgroundColor: bgColor }} className="p-6" data-testid="schema-consort">
        <div className="text-center space-y-2">
          <div className="text-sm font-medium text-foreground">Too many arms for CONSORT diagram ({armCount} arms)</div>
          <div className="text-xs text-muted-foreground">
            For studies with {armCount} treatment arms, consider switching to:<br />
            • <strong>Study Design Timeline</strong> for comprehensive overview<br />
            • <strong>Sankey Diagram</strong> for patient flow visualization
          </div>
        </div>
      </div>
    );
  }

  if (orientation === 'horizontal') {
    const svgWidth = 980;
    const horizontalPadding = 48;
    const enrollmentWidth = 200;
    const enrollmentHeight = 92;
    const randomizationWidth = 220;
    const randomizationHeight = 92;
    const stageGap = 120;
    const branchGap = 36;
    const armBoxWidth = 280;
    const minArmBoxHeight = 150;
    const armSpacing = 32;
    const outerVerticalPadding = 60;
    const textLineHeight = SVG_LINE_HEIGHT;
    const innerTopPadding = 24;
    const innerBottomPadding = 28;
    const descriptionGap = 6;
    const metricsGap = 14;
    const metricsLineHeight = 18;

    const armLayouts = arms.map((arm) => {
      const nameLines = wrapSvgText(arm.name || 'Arm', 26);
      const descriptionLines = wrapSvgText(arm.description ?? '', 28);
      const metricsBlockHeight = 4 * metricsLineHeight;
      const nameHeight = Math.max(1, nameLines.length) * textLineHeight;
      const descriptionHeight = descriptionLines.length * textLineHeight;
      const contentHeight = innerTopPadding
        + nameHeight
        + (descriptionLines.length > 0 ? descriptionGap + descriptionHeight : 0)
        + metricsGap
        + metricsBlockHeight
        + innerBottomPadding;

      const height = Math.max(minArmBoxHeight, contentHeight);
      return {
        arm,
        nameLines,
        descriptionLines,
        height,
      };
    });

    const totalArmHeight = armLayouts.reduce((sum, layout) => sum + layout.height, 0)
      + armSpacing * Math.max(0, armCount - 1);
    const svgHeight = Math.max(360, totalArmHeight + outerVerticalPadding * 2);

    const enrollmentX = horizontalPadding;
    const enrollmentY = svgHeight / 2 - enrollmentHeight / 2;
    const randomizationX = enrollmentX + enrollmentWidth + stageGap;
    const randomizationY = svgHeight / 2 - randomizationHeight / 2;
    const randomizationCenter = {
      x: randomizationX + randomizationWidth,
      y: randomizationY + randomizationHeight / 2,
    };
    const armColumnX = randomizationCenter.x + branchGap;
    const armsTop = (svgHeight - totalArmHeight) / 2;

    let currentArmY = armsTop;

    return (
      <div style={{ backgroundColor: bgColor }} className="p-6" data-testid="schema-consort">
        <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="mx-auto">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" />
            </marker>
          </defs>

          <rect
            x={enrollmentX}
            y={enrollmentY}
            width={enrollmentWidth}
            height={enrollmentHeight}
            fill={colors[0]}
            fillOpacity="0.18"
            stroke={colors[0]}
            strokeWidth="2"
            rx="6"
          />
          <text
            x={enrollmentX + enrollmentWidth / 2}
            y={enrollmentY + 40}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            fontSize="16"
            fontWeight="600"
          >
            Enrollment
          </text>
          <text
            x={enrollmentX + enrollmentWidth / 2}
            y={enrollmentY + 64}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            fontSize="14"
          >
            n={totalEnrolled}
          </text>

          <line
            x1={enrollmentX + enrollmentWidth}
            y1={enrollmentY + enrollmentHeight / 2}
            x2={randomizationX}
            y2={randomizationY + randomizationHeight / 2}
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />

          <rect
            x={randomizationX}
            y={randomizationY}
            width={randomizationWidth}
            height={randomizationHeight}
            fill={colors[1] || colors[0]}
            fillOpacity="0.15"
            stroke={colors[1] || colors[0]}
            strokeWidth="2"
            rx="6"
          />
          <text
            x={randomizationX + randomizationWidth / 2}
            y={randomizationY + 40}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            fontSize="15"
            fontWeight="600"
          >
            Randomization
          </text>
          {schemaData.randomizationRatio && (
            <text
              x={randomizationX + randomizationWidth / 2}
              y={randomizationY + 62}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="12"
            >
              {schemaData.randomizationRatio}
            </text>
          )}
          {armLayouts.map((layout, index) => {
            const { arm, nameLines, descriptionLines, height } = layout;
            const armY = currentArmY;
            const centerY = armY + height / 2;
            const armColor = colors[index % colors.length];
            const branchX = randomizationCenter.x + branchGap / 2;
            const nameStartY = armY + innerTopPadding;
            const descriptionStartY = nameStartY + nameLines.length * textLineHeight + (descriptionLines.length > 0 ? descriptionGap : 0);
            const metricsStartY = descriptionStartY + (descriptionLines.length > 0 ? descriptionLines.length * textLineHeight : 0) + metricsGap;
            const metrics: Array<{ label: string; value?: number; emphasize?: boolean }> = [
              { label: 'Enrolled', value: arm.enrolled },
              { label: 'Completed', value: arm.completed },
              { label: 'Withdrawn', value: arm.withdrawn },
              { label: 'Analyzed', emphasize: true },
            ];

            currentArmY += height + armSpacing;

            return (
              <g key={`${arm.name}-${index}`}>
                <path
                  d={`M ${randomizationCenter.x} ${randomizationCenter.y} L ${branchX} ${randomizationCenter.y} L ${branchX} ${centerY} L ${armColumnX} ${centerY}`}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />

                <rect
                  x={armColumnX}
                  y={armY}
                  width={armBoxWidth}
                  height={height}
                  fill={armColor}
                  fillOpacity="0.14"
                  stroke={armColor}
                  strokeWidth="2"
                  rx="8"
                />

                <text x={armColumnX + armBoxWidth / 2} y={nameStartY} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="13" fontWeight="600">
                  {nameLines.map((line, lineIndex) => (
                    <tspan key={`${arm.name}-horizontal-name-${lineIndex}`} x={armColumnX + armBoxWidth / 2} dy={lineIndex === 0 ? 0 : SVG_LINE_HEIGHT}>
                      {line}
                    </tspan>
                  ))}
                </text>

                {descriptionLines.length > 0 && (
                  <text x={armColumnX + armBoxWidth / 2} y={descriptionStartY} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11">
                    {descriptionLines.map((line, lineIndex) => (
                      <tspan key={`${arm.name}-horizontal-desc-${lineIndex}`} x={armColumnX + armBoxWidth / 2} dy={lineIndex === 0 ? 0 : SVG_LINE_HEIGHT}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                )}

                {metrics.map((metric, metricIndex) => (
                  <text
                    key={`${arm.name}-metric-${metric.label}`}
                    x={armColumnX + armBoxWidth / 2}
                    y={metricsStartY + metricIndex * metricsLineHeight}
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize="12"
                    fontWeight={metric.emphasize ? 600 : 400}
                  >
                    {metric.value === undefined
                      ? metric.label
                      : `${metric.label}: ${formatCount(metric.value)}`}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Default vertical layout
  const svgWidth = 820;
  const svgHeight = 720;
  const horizontalPadding = 60;
  const availableWidth = svgWidth - horizontalPadding * 2;
  const baseArmBoxWidth = 200;
  const baseSpacing = 40;
  const minArmBoxWidth = 120;
  const minSpacing = 16;

  let armBoxWidth = baseArmBoxWidth;
  let spacing = baseSpacing;
  let totalWidth = armCount * armBoxWidth + (armCount - 1) * spacing;

  if (totalWidth > availableWidth) {
    const scale = availableWidth / totalWidth;
    armBoxWidth = Math.max(minArmBoxWidth, baseArmBoxWidth * scale);
    spacing = Math.max(minSpacing, baseSpacing * scale);
    totalWidth = armCount * armBoxWidth + (armCount - 1) * spacing;
  }

  const startX = (svgWidth - totalWidth) / 2;

  const verticalTopPadding = 22;
  const verticalBottomPadding = 32;
  const verticalDescriptionGap = 6;
  const minTopBoxHeight = 120;

  const verticalLayouts = arms.map((arm) => {
    const nameLines = wrapSvgText(arm.name || 'Arm', 18);
    const descriptionLines = wrapSvgText(arm.description ?? '', 22);
    const nameHeight = Math.max(1, nameLines.length) * SVG_LINE_HEIGHT;
    const descriptionHeight = descriptionLines.length * SVG_LINE_HEIGHT;
    const contentHeight = verticalTopPadding
      + nameHeight
      + (descriptionLines.length > 0 ? verticalDescriptionGap + descriptionHeight : 0)
      + verticalBottomPadding;
    const topBoxHeight = Math.max(minTopBoxHeight, contentHeight);
    return {
      nameLines,
      descriptionLines,
      topBoxHeight,
    };
  });

  const uniformTopBoxHeight = verticalLayouts.reduce((max, layout) => Math.max(max, layout.topBoxHeight), minTopBoxHeight);

  // SINGLE ARM LAYOUT
  if (armCount === 1) {
    const arm = arms[0];
    const { nameLines, descriptionLines } = verticalLayouts[0];
    const armColor = colors[0];
    const centerX = svgWidth / 2;

    // Y-positions
    const screenedY = 24;
    const screenedHeight = 60;
    const enrolledY = 120;
    const enrolledHeight = 72;
    const treatmentY = 230;
    const treatmentHeight = uniformTopBoxHeight; // Use calculated height
    const analysisY = treatmentY + treatmentHeight + 44;
    const analysisHeight = 126;

    const screenedCount = schemaData.screenedCount;

    return (
      <div style={{ backgroundColor: bgColor }} className="p-6" data-testid="schema-consort">
        <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="mx-auto">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" />
            </marker>
          </defs>

          {/* Screened Box (Optional) */}
          {screenedCount !== undefined && (
            <g>
              <rect x={centerX - 100} y={screenedY} width="200" height={screenedHeight} fill={colors[0]} fillOpacity="0.1" stroke={colors[0]} strokeWidth="2" rx="6" />
              <text x={centerX} y={screenedY + 35} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="16" fontWeight="600">
                Screened
              </text>
              <text x={centerX} y={screenedY + 52} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14">
                n={screenedCount}
              </text>
              <line x1={centerX} y1={screenedY + screenedHeight} x2={centerX} y2={enrolledY} stroke="hsl(var(--foreground))" strokeWidth="2" markerEnd="url(#arrowhead)" />
            </g>
          )}

          {/* Enrolled/Treated Box */}
          <rect x={centerX - 160} y={enrolledY} width="320" height={enrolledHeight} fill={colors[0]} fillOpacity="0.2" stroke={colors[0]} strokeWidth="2" rx="6" />
          <text x={centerX} y={enrolledY + 30} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="18" fontWeight="600">
            Enrolled / Treated
          </text>
          <text x={centerX} y={enrolledY + 52} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14">
            n={totalEnrolled}
          </text>

          <line x1={centerX} y1={enrolledY + enrolledHeight} x2={centerX} y2={treatmentY} stroke="hsl(var(--foreground))" strokeWidth="2" markerEnd="url(#arrowhead)" />

          {/* Treatment Arm Box */}
          <rect
            x={centerX - armBoxWidth / 2}
            y={treatmentY}
            width={armBoxWidth}
            height={treatmentHeight}
            fill={armColor}
            fillOpacity="0.16"
            stroke={armColor}
            strokeWidth="2"
            rx="6"
          />

          <text x={centerX} y={treatmentY + verticalTopPadding} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="13" fontWeight="600">
            {nameLines.map((line, lineIndex) => (
              <tspan key={`single-arm-name-${lineIndex}`} x={centerX} dy={lineIndex === 0 ? 0 : SVG_LINE_HEIGHT}>
                {line}
              </tspan>
            ))}
          </text>
          {descriptionLines.length > 0 && (
            <text x={centerX} y={treatmentY + verticalTopPadding + nameLines.length * SVG_LINE_HEIGHT + (descriptionLines.length > 0 ? verticalDescriptionGap : 0)} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11">
              {descriptionLines.map((line, lineIndex) => (
                <tspan key={`single-arm-desc-${lineIndex}`} x={centerX} dy={lineIndex === 0 ? 0 : SVG_LINE_HEIGHT}>
                  {line}
                </tspan>
              ))}
            </text>
          )}
          <text x={centerX} y={treatmentY + treatmentHeight - verticalBottomPadding} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12">
            Enrolled: {formatCount(arm.enrolled)}
          </text>

          <line x1={centerX} y1={treatmentY + treatmentHeight} x2={centerX} y2={analysisY} stroke="hsl(var(--foreground))" strokeWidth="2" markerEnd="url(#arrowhead)" />

          {/* Analysis Box */}
          <rect
            x={centerX - armBoxWidth / 2}
            y={analysisY}
            width={armBoxWidth}
            height={analysisHeight}
            fill={armColor}
            fillOpacity="0.1"
            stroke={armColor}
            strokeWidth="2"
            rx="6"
          />
          {arm.completed !== undefined && (
            <text x={centerX} y={analysisY + 34} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12">
              Completed: {formatCount(arm.completed)}
            </text>
          )}
          {arm.withdrawn !== undefined && (
            <text x={centerX} y={analysisY + 58} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12">
              Withdrawn: {formatCount(arm.withdrawn)}
            </text>
          )}
          <text x={centerX} y={analysisY + 82} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="600">
            Analyzed
          </text>
        </svg>
      </div>
    );
  }

  // MULTI-ARM LAYOUT (Original)
  return (
    <div style={{ backgroundColor: bgColor }} className="p-6" data-testid="schema-consort">
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="mx-auto">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" />
          </marker>
        </defs>

        <rect x={svgWidth / 2 - 160} y="24" width="320" height="72" fill={colors[0]} fillOpacity="0.2" stroke={colors[0]} strokeWidth="2" rx="6" />
        <text x={svgWidth / 2} y="60" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="18" fontWeight="600">
          Enrollment
        </text>
        <text x={svgWidth / 2} y="82" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14">
          n={totalEnrolled}
        </text>

        <line x1={svgWidth / 2} y1="96" x2={svgWidth / 2} y2="150" stroke="hsl(var(--foreground))" strokeWidth="2" markerEnd="url(#arrowhead)" />

        <rect x={svgWidth / 2 - 160} y="150" width="320" height="70" fill={colors[1] || colors[0]} fillOpacity="0.15" stroke={colors[1] || colors[0]} strokeWidth="2" rx="6" />
        <text x={svgWidth / 2} y="188" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="15" fontWeight="600">
          Randomization
        </text>
        {schemaData.randomizationRatio && (
          <text x={svgWidth / 2} y="208" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12">
            {schemaData.randomizationRatio}
          </text>
        )}
        {arms.map((arm, index) => {
          const x = startX + index * (armBoxWidth + spacing);
          const centerX = x + armBoxWidth / 2;
          const armColor = colors[index % colors.length];
          const { nameLines, descriptionLines } = verticalLayouts[index];
          const firstBoxTop = 268;
          const firstBoxHeight = uniformTopBoxHeight;
          const firstBoxBottom = firstBoxTop + firstBoxHeight;
          const secondBoxTop = firstBoxBottom + 44;
          const secondBoxHeight = 126;
          const nameStartY = firstBoxTop + verticalTopPadding;
          const descriptionStartY = nameStartY + nameLines.length * SVG_LINE_HEIGHT + (descriptionLines.length > 0 ? verticalDescriptionGap : 0);
          const enrolledY = firstBoxBottom - verticalBottomPadding;

          return (
            <g key={`${arm.name}-${index}`}>
              <line
                x1={svgWidth / 2}
                y1="220"
                x2={centerX}
                y2={firstBoxTop}
                stroke="hsl(var(--foreground))"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />

              <rect
                x={x}
                y={firstBoxTop}
                width={armBoxWidth}
                height={firstBoxHeight}
                fill={armColor}
                fillOpacity="0.16"
                stroke={armColor}
                strokeWidth="2"
                rx="6"
              />

              <text x={centerX} y={nameStartY} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="13" fontWeight="600">
                {nameLines.map((line, lineIndex) => (
                  <tspan key={`${arm.name}-vertical-name-${lineIndex}`} x={centerX} dy={lineIndex === 0 ? 0 : SVG_LINE_HEIGHT}>
                    {line}
                  </tspan>
                ))}
              </text>
              {descriptionLines.length > 0 && (
                <text x={centerX} y={descriptionStartY} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11">
                  {descriptionLines.map((line, lineIndex) => (
                    <tspan key={`${arm.name}-vertical-desc-${lineIndex}`} x={centerX} dy={lineIndex === 0 ? 0 : SVG_LINE_HEIGHT}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
              <text x={centerX} y={enrolledY} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12">
                Enrolled: {formatCount(arm.enrolled)}
              </text>

              <line
                x1={centerX}
                y1={firstBoxBottom}
                x2={centerX}
                y2={secondBoxTop}
                stroke="hsl(var(--foreground))"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />

              <rect
                x={x}
                y={secondBoxTop}
                width={armBoxWidth}
                height={secondBoxHeight}
                fill={armColor}
                fillOpacity="0.1"
                stroke={armColor}
                strokeWidth="2"
                rx="6"
              />
              {arm.completed !== undefined && (
                <text x={centerX} y={secondBoxTop + 34} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12">
                  Completed: {formatCount(arm.completed)}
                </text>
              )}
              {arm.withdrawn !== undefined && (
                <text x={centerX} y={secondBoxTop + 58} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12">
                  Withdrawn: {formatCount(arm.withdrawn)}
                </text>
              )}
              <text x={centerX} y={secondBoxTop + 82} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="600">
                Analyzed
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SankeyDiagram({
  schemaData,
  colors,
  bgColor
}: {
  schemaData: StudySchemaData;
  colors: readonly string[];
  bgColor: string;
}) {
  const totalEnrolled = schemaData.totalEnrolled || 0;
  let arms = schemaData.arms || [];

  // Fallback: If no arms are defined but we have total enrollment, create a generic "Study Population" arm
  // This ensures the Sankey shows at least the enrollment flow.
  if (arms.length === 0 && totalEnrolled > 0) {
    arms = [{
      name: 'Study Population',
      enrolled: totalEnrolled,
      // We don't have global completed/withdrawn in the schema root, so we can't infer them here
      // unless we add them to the schema. For now, just showing enrollment is better than an empty error.
    }];
  } else if (arms.length > 0 && !arms.some(a => a.enrolled)) {
    // If arms exist but have no enrollment numbers, try to distribute totalEnrolled or just use it for the first arm
    // This handles cases where AI extracted arm names but forgot numbers
    if (totalEnrolled > 0) {
      const split = Math.floor(totalEnrolled / arms.length);
      arms = arms.map((a, i) => ({
        ...a,
        enrolled: i === arms.length - 1 ? (totalEnrolled - split * (arms.length - 1)) : split
      }));
    }
  }

  // Construct Sankey Data
  // Nodes: 0=Enrolled, 1..N=Arms, N+1..2N=Completed, 2N+1..3N=Withdrawn?
  // Let's simplify: Enrolled -> Arms -> Completed/Withdrawn

  const nodes: { label: string; color?: string }[] = [];
  const links: { source: number; target: number; value: number; color?: string }[] = [];

  // Node 0: Enrolled
  nodes.push({ label: `Enrolled (n=${totalEnrolled})`, color: colors[0] });
  const enrolledIndex = 0;

  let currentIndex = 1;

  arms.forEach((arm, index) => {
    const armColor = colors[index % colors.length];

    // Arm Node
    const armLabel = `${arm.name} (n=${arm.enrolled || 0})`;
    nodes.push({ label: armLabel, color: armColor });
    const armIndex = currentIndex++;

    // Link Enrolled -> Arm
    if (arm.enrolled) {
      links.push({
        source: enrolledIndex,
        target: armIndex,
        value: arm.enrolled,
        color: `${armColor}40` // Semi-transparent
      });
    }

    // Completed Node (optional, or shared?)
    // Usually Sankey shows flow to outcomes. Let's create specific outcome nodes for each arm to avoid crossing lines messiness, 
    // or shared "Completed" / "Discontinued" nodes.
    // Shared nodes are better for comparing rates.

    // Let's try shared "Completed" and "Withdrawn" nodes for the whole study? 
    // Or per arm? The user's previous SVG had per-arm flow. 
    // Let's stick to per-arm flow for clarity in this specific clinical trial context, 
    // often they want to see what happened in *that* arm.

    if (arm.completed) {
      const completedLabel = `Completed (${arm.name})`;
      nodes.push({ label: completedLabel, color: armColor });
      const completedIndex = currentIndex++;

      links.push({
        source: armIndex,
        target: completedIndex,
        value: arm.completed,
        color: `${armColor}40`
      });
    }

    if (arm.withdrawn) {
      const withdrawnLabel = `Withdrawn (${arm.name})`;
      nodes.push({ label: withdrawnLabel, color: '#ef4444' }); // Red for withdrawn
      const withdrawnIndex = currentIndex++;

      links.push({
        source: armIndex,
        target: withdrawnIndex,
        value: arm.withdrawn,
        color: '#ef444440'
      });
    }
  });

  if (links.length === 0) {
    return (
      <div style={{ backgroundColor: bgColor, height: '500px' }} className="p-4 flex items-center justify-center" data-testid="schema-sankey-empty">
        <p className="text-muted-foreground">Insufficient data for Sankey diagram (no flows detected)</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bgColor, height: '500px' }} className="p-4" data-testid="schema-sankey">
      <Plot
        data={[{
          type: "sankey",
          orientation: "h",
          node: {
            pad: 15,
            thickness: 20,
            line: {
              color: "black",
              width: 0.5
            },
            label: nodes.map(n => n.label),
            color: nodes.map(n => n.color || 'gray')
          },
          link: {
            source: links.map(l => l.source),
            target: links.map(l => l.target),
            value: links.map(l => l.value),
            color: links.map(l => l.color || 'gray')
          }
        }]}
        layout={{
          font: { size: 12, family: "Inter, sans-serif" },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 50, r: 10, t: 10, b: 10 },
          autosize: true,
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        config={{ displayModeBar: false }}
      />
    </div>
  );
}

function StudyDesignSchema({
  schemaData,
  colors,
  bgColor
}: {
  schemaData: StudySchemaData;
  colors: readonly string[];
  bgColor: string;
}) {
  const arms = schemaData.arms || [];
  const hasTimeline = !!schemaData.timeline;
  const hasEndpoints = (schemaData.primaryEndpoints?.length || 0) > 0;

  return (
    <div style={{ backgroundColor: bgColor }} className="p-6" data-testid="schema-study-design">
      <div className="space-y-6">
        <div className="border-l-4 pl-4" style={{ borderColor: colors[0] }}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {schemaData.studyPhase && (
              <div>
                <span className="font-semibold text-foreground">Study Phase:</span>
                <span className="ml-2 text-muted-foreground">{schemaData.studyPhase}</span>
              </div>
            )}
            {schemaData.studyDesign && (
              <div>
                <span className="font-semibold text-foreground">Design:</span>
                <span className="ml-2 text-muted-foreground">{schemaData.studyDesign}</span>
              </div>
            )}
            {schemaData.totalEnrolled && (
              <div>
                <span className="font-semibold text-foreground">Total Enrolled:</span>
                <span className="ml-2 text-muted-foreground">{schemaData.totalEnrolled}</span>
              </div>
            )}
            {schemaData.randomizationRatio && (
              <div>
                <span className="font-semibold text-foreground">Randomization:</span>
                <span className="ml-2 text-muted-foreground">{schemaData.randomizationRatio}</span>
              </div>
            )}
          </div>
        </div>

        {hasTimeline && schemaData.timeline && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Study Timeline</h4>
            <div className="relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-border"></div>
              <div className="relative flex justify-between items-center">
                {Object.entries(schemaData.timeline).filter(([_, v]) => v).map(([key, value], index) => (
                  <div key={key} className="flex flex-col items-center">
                    <div
                      className="w-4 h-4 rounded-full mb-2"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    ></div>
                    <div className="text-xs font-medium text-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                    <div className="text-xs text-muted-foreground">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Treatment Arms</h4>
          <div className="grid gap-3">
            {arms.map((arm, index) => (
              <div
                key={arm.name}
                className="rounded-lg p-4 border-2"
                style={{
                  borderColor: colors[index % colors.length],
                  backgroundColor: `${colors[index % colors.length]}10`
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{arm.name}</div>
                    {arm.description && (
                      <div className="text-sm text-muted-foreground mt-1">{arm.description}</div>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm ml-4">
                    {arm.enrolled !== undefined && (
                      <div className="text-center">
                        <div className="font-semibold text-foreground">{arm.enrolled}</div>
                        <div className="text-xs text-muted-foreground">Enrolled</div>
                      </div>
                    )}
                    {arm.completed !== undefined && (
                      <div className="text-center">
                        <div className="font-semibold text-foreground">{arm.completed}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                    )}
                    {arm.withdrawn !== undefined && (
                      <div className="text-center">
                        <div className="font-semibold text-foreground">{arm.withdrawn}</div>
                        <div className="text-xs text-muted-foreground">Withdrawn</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {hasEndpoints && (
          <div className="grid md:grid-cols-2 gap-4">
            {schemaData.primaryEndpoints && schemaData.primaryEndpoints.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Primary Endpoints</h4>
                <ul className="space-y-1">
                  {schemaData.primaryEndpoints.map((endpoint, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start">
                      <span className="mr-2" style={{ color: colors[0] }}>•</span>
                      {endpoint}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {schemaData.secondaryEndpoints && schemaData.secondaryEndpoints.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Secondary Endpoints</h4>
                <ul className="space-y-1">
                  {schemaData.secondaryEndpoints.map((endpoint, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start">
                      <span className="mr-2" style={{ color: colors[1] || colors[0] }}>•</span>
                      {endpoint}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
