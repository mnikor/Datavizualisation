import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { colorPalettes, type PaletteKey } from '@/lib/chartPalettes';

interface ColorPaletteSelectorProps {
  selected: PaletteKey;
  onChange: (palette: PaletteKey) => void;
}

export default function ColorPaletteSelector({ selected, onChange }: ColorPaletteSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4" />
        <label className="text-sm font-medium">Color Palette</label>
      </div>
      <div className="space-y-2">
        {(Object.keys(colorPalettes) as PaletteKey[]).map((key) => {
          const palette = colorPalettes[key];
          return (
            <Button
              key={key}
              variant={selected === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(key)}
              className="w-full justify-start gap-3"
              data-testid={`palette-${key}`}
            >
              <div className="flex gap-1">
                {palette.colors.slice(0, 4).map((color, idx) => (
                  <div
                    key={idx}
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-sm">{palette.name}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
