export interface TypographyPresetStyles {
  titleFontFamily: string;
  titleFontSize: string;
  keyMessageFontFamily: string;
  keyMessageFontSize: string;
  axisLabelFontFamily: string;
  axisLabelFontSize: string;
  tickFontFamily: string;
  tickFontSize: string;
  legendFontFamily: string;
  legendFontSize: string;
  captionFontFamily: string;
  captionFontSize: string;
  captionItalic?: boolean;
}

export const typographyPresets: Record<string, TypographyPresetStyles> = {
  default: {
    titleFontFamily: 'Helvetica, Arial, sans-serif',
    titleFontSize: '16px',
    keyMessageFontFamily: 'Helvetica, Arial, sans-serif',
    keyMessageFontSize: '14px',
    axisLabelFontFamily: 'Helvetica, Arial, sans-serif',
    axisLabelFontSize: '12px',
    tickFontFamily: 'Helvetica, Arial, sans-serif',
    tickFontSize: '10px',
    legendFontFamily: 'Helvetica, Arial, sans-serif',
    legendFontSize: '12px',
    captionFontFamily: 'Helvetica, Arial, sans-serif',
    captionFontSize: '10px',
    captionItalic: false,
  },
  nejm: {
    titleFontFamily: '"Times New Roman", Times, serif',
    titleFontSize: '16px',
    keyMessageFontFamily: '"Times New Roman", Times, serif',
    keyMessageFontSize: '13px',
    axisLabelFontFamily: 'Helvetica, Arial, sans-serif',
    axisLabelFontSize: '12px',
    tickFontFamily: 'Helvetica, Arial, sans-serif',
    tickFontSize: '10px',
    legendFontFamily: '"Times New Roman", Times, serif',
    legendFontSize: '12px',
    captionFontFamily: '"Times New Roman", Times, serif',
    captionFontSize: '11px',
    captionItalic: true,
  },
  nature: {
    titleFontFamily: '"Times New Roman", Times, serif',
    titleFontSize: '16px',
    keyMessageFontFamily: '"Times New Roman", Times, serif',
    keyMessageFontSize: '12px',
    axisLabelFontFamily: 'Helvetica, Arial, sans-serif',
    axisLabelFontSize: '11px',
    tickFontFamily: 'Helvetica, Arial, sans-serif',
    tickFontSize: '9px',
    legendFontFamily: 'Helvetica, Arial, sans-serif',
    legendFontSize: '11px',
    captionFontFamily: '"Times New Roman", Times, serif',
    captionFontSize: '10px',
    captionItalic: true,
  },
  jama: {
    titleFontFamily: 'Helvetica, Arial, sans-serif',
    titleFontSize: '16px',
    keyMessageFontFamily: 'Helvetica, Arial, sans-serif',
    keyMessageFontSize: '13px',
    axisLabelFontFamily: 'Helvetica, Arial, sans-serif',
    axisLabelFontSize: '12px',
    tickFontFamily: 'Helvetica, Arial, sans-serif',
    tickFontSize: '10px',
    legendFontFamily: 'Helvetica, Arial, sans-serif',
    legendFontSize: '12px',
    captionFontFamily: 'Helvetica, Arial, sans-serif',
    captionFontSize: '11px',
    captionItalic: false,
  },
};
