import { useRef, useEffect, useMemo, type RefObject } from 'react';
import { type SpectrogramData } from '@/types/analysis';
import { type Viewport, type CursorData } from '@/hooks/use-viz-viewport';

interface SpectrogramCanvasProps {
  data: SpectrogramData;
  colormap?: 'magma' | 'inferno' | 'viridis' | 'plasma' | 'grayscale';
  minDb?: number;
  maxDb?: number;
  ceilingHz?: number;
  showCdNyquist?: boolean;
  viewport?: Viewport;
  cursorRef?: RefObject<CursorData | null>;
  cursorLabel?: (dataX: number, dataY: number) => string;
  canvasHandlers?: Record<string, any>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * Pre-computed 256-entry LUTs sampled from matplotlib reference data.
 * Each entry is [R, G, B] in 0-255.
 */
function buildLUT(fn: (t: number) => [number, number, number]): Uint8Array {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = fn(i / 255);
    lut[i * 3] = r;
    lut[i * 3 + 1] = g;
    lut[i * 3 + 2] = b;
  }
  return lut;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function piecewise(t: number, stops: [number, number, number, number][]): [number, number, number] {
  if (t <= stops[0][0]) return [Math.round(stops[0][1] * 255), Math.round(stops[0][2] * 255), Math.round(stops[0][3] * 255)];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const f = (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return [
        Math.round(lerp(stops[i - 1][1], stops[i][1], f) * 255),
        Math.round(lerp(stops[i - 1][2], stops[i][2], f) * 255),
        Math.round(lerp(stops[i - 1][3], stops[i][3], f) * 255),
      ];
    }
  }
  const last = stops[stops.length - 1];
  return [Math.round(last[1] * 255), Math.round(last[2] * 255), Math.round(last[3] * 255)];
}

const magmaStops: [number, number, number, number][] = [
  [0.0,  0.001, 0.000, 0.014],
  [0.13, 0.108, 0.047, 0.262],
  [0.25, 0.232, 0.059, 0.437],
  [0.38, 0.390, 0.100, 0.502],
  [0.50, 0.550, 0.161, 0.506],
  [0.63, 0.716, 0.215, 0.475],
  [0.75, 0.868, 0.287, 0.409],
  [0.88, 0.967, 0.439, 0.360],
  [1.0,  0.987, 0.991, 0.750],
];

const infernoStops: [number, number, number, number][] = [
  [0.0,  0.001, 0.000, 0.014],
  [0.13, 0.120, 0.047, 0.282],
  [0.25, 0.258, 0.039, 0.406],
  [0.38, 0.416, 0.056, 0.370],
  [0.50, 0.578, 0.148, 0.280],
  [0.63, 0.735, 0.246, 0.165],
  [0.75, 0.865, 0.370, 0.050],
  [0.88, 0.954, 0.555, 0.039],
  [1.0,  0.988, 0.998, 0.645],
];

const viridisStops: [number, number, number, number][] = [
  [0.0,  0.267, 0.004, 0.329],
  [0.13, 0.283, 0.141, 0.458],
  [0.25, 0.254, 0.265, 0.530],
  [0.38, 0.207, 0.372, 0.553],
  [0.50, 0.163, 0.471, 0.558],
  [0.63, 0.128, 0.567, 0.551],
  [0.75, 0.134, 0.658, 0.518],
  [0.88, 0.478, 0.821, 0.318],
  [1.0,  0.993, 0.906, 0.144],
];

const plasmaStops: [number, number, number, number][] = [
  [0.0,  0.050, 0.030, 0.528],
  [0.13, 0.229, 0.029, 0.586],
  [0.25, 0.381, 0.002, 0.603],
  [0.38, 0.530, 0.027, 0.563],
  [0.50, 0.659, 0.134, 0.468],
  [0.63, 0.773, 0.254, 0.361],
  [0.75, 0.870, 0.374, 0.250],
  [0.88, 0.945, 0.520, 0.134],
  [1.0,  0.940, 0.975, 0.131],
];

const LUTS: Record<string, Uint8Array> = {
  magma: buildLUT((t) => piecewise(t, magmaStops)),
  inferno: buildLUT((t) => piecewise(t, infernoStops)),
  viridis: buildLUT((t) => piecewise(t, viridisStops)),
  plasma: buildLUT((t) => piecewise(t, plasmaStops)),
  grayscale: buildLUT((t) => { const v = Math.round(t * 255); return [v, v, v]; }),
};

export function SpectrogramCanvas({
  data,
  colormap = 'magma',
  minDb = -120,
  maxDb = 0,
  ceilingHz,
  showCdNyquist = false,
  viewport,
  cursorRef,
  cursorLabel,
  canvasHandlers,
  canvasRef: externalRef,
}: SpectrogramCanvasProps) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const ref = externalRef || internalRef;
  const lut = useMemo(() => LUTS[colormap] || LUTS.magma, [colormap]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef<number>(0);

  // ResizeObserver to match canvas pixel buffer to rendered size
  useEffect(() => {
    const canvas = (ref as React.RefObject<HTMLCanvasElement>).current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const dpr = window.devicePixelRatio || 1;
        const w = Math.round(entry.contentRect.width * dpr);
        const h = Math.round(entry.contentRect.height * dpr);
        if (w > 0 && h > 0 && (w !== sizeRef.current.w || h !== sizeRef.current.h)) {
          sizeRef.current = { w, h };
          canvas.width = w;
          canvas.height = h;
        }
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [ref]);

  // Main data paint — does NOT depend on cursor
  useEffect(() => {
    const canvas = (ref as React.RefObject<HTMLCanvasElement>).current;
    if (!canvas || !data.magnitudes.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    const numFrames = data.magnitudes.length;
    const numBins = data.magnitudes[0].length;
    const dbRange = maxDb - minDb;
    const nyquist = data.sampleRate / 2;

    const xMin = viewport?.xMin ?? 0;
    const xMax = viewport?.xMax ?? 1;
    const yMin = viewport?.yMin ?? 0;
    const yMax = viewport?.yMax ?? 1;

    const startFrame = Math.floor(xMin * numFrames);
    const endFrame = Math.ceil(xMax * numFrames);
    const startBin = Math.floor(yMin * numBins);
    const endBin = Math.ceil(yMax * numBins);

    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    for (let dx = 0; dx < width; dx++) {
      const frameIdx = Math.min(endFrame - 1, startFrame + ((dx / width * (endFrame - startFrame)) | 0));
      const frame = data.magnitudes[frameIdx];
      for (let dy = 0; dy < height; dy++) {
        const binFrac = 1 - dy / height;
        const binIdx = Math.min(endBin - 1, startBin + ((binFrac * (endBin - startBin)) | 0));
        const db = frame[binIdx];
        const t = Math.max(0, Math.min(1, (db - minDb) / dbRange));
        const lutIdx = (t * 255) | 0;
        const li = lutIdx * 3;
        const idx = (dy * width + dx) * 4;
        pixels[idx] = lut[li];
        pixels[idx + 1] = lut[li + 1];
        pixels[idx + 2] = lut[li + 2];
        pixels[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Overlay lines
    ctx.font = `${Math.round(10 * (window.devicePixelRatio || 1))}px monospace`;

    const freqToY = (freq: number) => {
      const binFrac = freq / nyquist;
      const viewFrac = (binFrac - yMin) / (yMax - yMin);
      return (1 - viewFrac) * height;
    };

    if (ceilingHz && ceilingHz < nyquist) {
      const yPos = freqToY(ceilingHz);
      if (yPos >= 0 && yPos <= height) {
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(0, yPos);
        ctx.lineTo(width, yPos);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 80, 80, 0.9)';
        ctx.textAlign = 'left';
        ctx.fillText(`Ceiling: ${ceilingHz >= 1000 ? `${(ceilingHz / 1000).toFixed(1)}k` : Math.round(ceilingHz)} Hz`, 4, yPos - 4);
      }
    }

    if (showCdNyquist && nyquist > 22050) {
      const cdY = freqToY(22050);
      if (cdY >= 0 && cdY <= height) {
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, cdY);
        ctx.lineTo(width, cdY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
        ctx.textAlign = 'left';
        ctx.fillText('CD Nyquist (22.05k)', 4, cdY - 4);
      }
    }

    // Frequency axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'right';
    const freqLabels = [100, 500, 1000, 2000, 5000, 10000, 20000];
    for (const freq of freqLabels) {
      if (freq > nyquist) continue;
      const yPos = freqToY(freq);
      if (yPos < 0 || yPos > height) continue;
      ctx.fillText(`${freq >= 1000 ? `${freq / 1000}k` : freq}`, width - 4, yPos + 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(width - 30, yPos);
      ctx.stroke();
    }

    // Time axis labels
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const totalDuration = data.times[data.times.length - 1] || 0;
    const viewStartTime = (viewport?.xMin ?? 0) * totalDuration;
    const viewEndTime = (viewport?.xMax ?? 1) * totalDuration;
    const timeLabels = 5;
    for (let i = 0; i <= timeLabels; i++) {
      const t = viewStartTime + (i / timeLabels) * (viewEndTime - viewStartTime);
      const x = (i / timeLabels) * width;
      ctx.fillText(`${t.toFixed(1)}s`, x, height - 4);
    }
  }, [data, lut, minDb, maxDb, ceilingHz, showCdNyquist, viewport, ref, sizeRef.current.w, sizeRef.current.h]);

  // Crosshair overlay via rAF — reads cursorRef, no React re-renders
  useEffect(() => {
    const canvas = (ref as React.RefObject<HTMLCanvasElement>).current;
    if (!canvas || !cursorRef) return;

    // We use a second overlay canvas for the crosshair to avoid re-rendering the spectrogram
    let overlayCanvas = canvas.parentElement?.querySelector<HTMLCanvasElement>('.viz-cursor-overlay');
    if (!overlayCanvas) {
      overlayCanvas = document.createElement('canvas');
      overlayCanvas.className = 'viz-cursor-overlay';
      overlayCanvas.style.position = 'absolute';
      overlayCanvas.style.inset = '0';
      overlayCanvas.style.pointerEvents = 'none';
      overlayCanvas.style.width = '100%';
      overlayCanvas.style.height = '100%';
      canvas.parentElement?.appendChild(overlayCanvas);
    }

    let running = true;
    const draw = () => {
      if (!running) return;
      const w = canvas.width;
      const h = canvas.height;
      if (overlayCanvas!.width !== w || overlayCanvas!.height !== h) {
        overlayCanvas!.width = w;
        overlayCanvas!.height = h;
      }
      const ctx = overlayCanvas!.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);

      const cursor = cursorRef.current;
      if (cursor) {
        const cx = cursor.normX * w;
        const cy = cursor.normY * h;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw readout text on canvas
        if (cursorLabel) {
          const label = cursorLabel(cursor.dataX, cursor.dataY);
          const fontSize = Math.round(11 * (window.devicePixelRatio || 1));
          ctx.font = `${fontSize}px monospace`;
          const metrics = ctx.measureText(label);
          const pad = 4 * (window.devicePixelRatio || 1);
          const textX = Math.min(cx + pad, w - metrics.width - pad);
          const textY = Math.max(cy - pad, fontSize + pad);
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(textX - 2, textY - fontSize, metrics.width + 4, fontSize + 4);
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fillText(label, textX, textY);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(rafRef.current); overlayCanvas?.remove(); };
  }, [ref, cursorRef, cursorLabel]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={ref as React.RefObject<HTMLCanvasElement>}
        className="w-full rounded-md border border-border"
        style={{ imageRendering: 'auto', cursor: 'crosshair', height: '400px' }}
        {...canvasHandlers}
      />
    </div>
  );
}
