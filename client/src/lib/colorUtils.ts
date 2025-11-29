const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeHex = (hex: string) => {
  const cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    return cleaned
      .split('')
      .map((char) => char + char)
      .join('');
  }
  return cleaned.slice(0, 6);
};

const hexToRgb = (hex: string) => {
  try {
    const normalized = normalizeHex(hex);
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if ([r, g, b].some((channel) => Number.isNaN(channel))) return undefined;
    return { r, g, b } as const;
  } catch {
    return undefined;
  }
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${clamp(Math.round(r), 0, 255).toString(16).padStart(2, '0')}${clamp(Math.round(g), 0, 255)
    .toString(16)
    .padStart(2, '0')}${clamp(Math.round(b), 0, 255).toString(16).padStart(2, '0')}`;

export const tintColor = (hex: string, tint: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const amount = clamp(tint, 0, 1);
  const r = rgb.r + (255 - rgb.r) * amount;
  const g = rgb.g + (255 - rgb.g) * amount;
  const b = rgb.b + (255 - rgb.b) * amount;
  return rgbToHex(r, g, b);
};

export const shadeColor = (hex: string, shade: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const amount = clamp(shade, 0, 1);
  const r = rgb.r * (1 - amount);
  const g = rgb.g * (1 - amount);
  const b = rgb.b * (1 - amount);
  return rgbToHex(r, g, b);
};

export const getReadableTextColor = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#111827';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? '#111827' : '#FFFFFF';
};

export const generateColorVariant = (palette: readonly string[], index: number) => {
  if (palette.length === 0) {
    return '#3b82f6';
  }
  const baseColor = palette[index % palette.length];
  const variantTier = Math.floor(index / palette.length);
  if (variantTier === 0) {
    return baseColor;
  }
  const tintAmount = Math.min(0.18 * variantTier, 0.6);
  return tintColor(baseColor, tintAmount);
};
