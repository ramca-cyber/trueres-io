import { type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Download } from 'lucide-react';

export interface VizToggle {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export interface VizToolbarProps {
  // Zoom controls
  zoom?: {
    onIn: () => void;
    onOut: () => void;
    onReset: () => void;
    isZoomed: boolean;
  };

  // Cursor readout
  cursorReadout?: string;

  // dB range
  dbRange?: {
    min: number;
    max: number;
    onMinChange: (v: number) => void;
    onMaxChange: (v: number) => void;
    minBound?: number;
    maxBound?: number;
  };

  // Colormap
  colormap?: {
    value: string;
    onChange: (v: string) => void;
    options: readonly string[];
  };

  // Toggle switches
  toggles?: VizToggle[];

  // Fullscreen
  fullscreen?: {
    containerRef: RefObject<HTMLElement | null>;
  };

  // Download PNG
  download?: {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    filename?: string;
  };
}

export function VizToolbar({
  zoom,
  cursorReadout,
  dbRange,
  colormap,
  toggles,
  fullscreen,
  download,
}: VizToolbarProps) {
  const handleFullscreen = () => {
    const el = fullscreen?.containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  };

  const handleDownload = () => {
    const canvas = download?.canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = download?.filename || 'visualization.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {/* Zoom buttons */}
      {zoom && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={zoom.onIn} title="Zoom in (scroll wheel)">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={zoom.onOut} title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          {zoom.isZoomed && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={zoom.onReset} title="Reset view (double-click)">
              <RotateCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
          )}
        </div>
      )}

      {/* Cursor readout */}
      {cursorReadout && (
        <span className="font-mono text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
          {cursorReadout}
        </span>
      )}

      {/* dB range */}
      {dbRange && (
        <>
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium whitespace-nowrap">Min dB</label>
            <Slider
              value={[dbRange.min]}
              onValueChange={([v]) => dbRange.onMinChange(v)}
              min={dbRange.minBound ?? -160}
              max={dbRange.maxBound ?? -20}
              step={5}
              className="w-20"
            />
            <span className="text-xs font-mono text-muted-foreground w-8">{dbRange.min}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium whitespace-nowrap">Max dB</label>
            <Slider
              value={[dbRange.max]}
              onValueChange={([v]) => dbRange.onMaxChange(v)}
              min={-40}
              max={0}
              step={5}
              className="w-20"
            />
            <span className="text-xs font-mono text-muted-foreground w-8">{dbRange.max}</span>
          </div>
        </>
      )}

      {/* Colormap */}
      {colormap && (
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium">Colormap</label>
          <Select value={colormap.value} onValueChange={colormap.onChange}>
            <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {colormap.options.map((c) => (
                <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Toggles */}
      {toggles?.map((t) => (
        <div key={t.id} className="flex items-center gap-1.5">
          <Switch checked={t.checked} onCheckedChange={t.onChange} id={t.id} className="scale-75" />
          <Label htmlFor={t.id} className="text-xs cursor-pointer">{t.label}</Label>
        </div>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Fullscreen */}
      {fullscreen && (
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleFullscreen} title="Fullscreen">
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Download */}
      {download && (
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleDownload} title="Download PNG">
          <Download className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
