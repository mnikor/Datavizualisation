import { useState } from 'react';
import ColorPaletteSelector from '../ColorPaletteSelector';
import type { PaletteKey } from '@/lib/chartPalettes';

export default function ColorPaletteSelectorExample() {
  const [selected, setSelected] = useState<PaletteKey>('default');

  return <ColorPaletteSelector selected={selected} onChange={setSelected} />;
}
