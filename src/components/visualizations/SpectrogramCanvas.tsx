import { useRef, useEffect, useMemo } from 'react';
import { type SpectrogramData } from '@/types/analysis';

interface SpectrogramCanvasProps {
  data: SpectrogramData;
  width?: number;
  height?: number;
  colormap?: 'magma' | 'inferno' | 'viridis' | 'plasma' | 'grayscale';
  minDb?: number;
  maxDb?: number;
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

// Attempt to approximate the matplotlib colormaps more faithfully
// using piecewise-linear interpolation on key control points.

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function piecewise(t: number, stops: [number, number, number, number][]): [number, number, number] {
  // stops: [position, r, g, b] in 0-1 range
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

// Magma: black → deep purple → hot pink → yellow-white
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

// Inferno: black → indigo → orange → yellow
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

// Viridis: dark purple → teal → green → yellow
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

// Plasma: deep blue-purple → magenta → orange → yellow
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
  width = 900,
  height = 400,
  colormap = 'magma',
  minDb = -120,
  maxDb = 0,
}: SpectrogramCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lut = useMemo(() => LUTS[colormap] || LUTS.magma, [colormap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.magnitudes.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numFrames = data.magnitudes.length;
    const numBins = data.magnitudes[0].length;
    const dbRange = maxDb - minDb;

    // Create offscreen image
    const imgData = ctx.createImageData(numFrames, numBins);
    const pixels = imgData.data;

    for (let x = 0; x < numFrames; x++) {
      const frame = data.magnitudes[x];
      for (let y = 0; y < numBins; y++) {
        const db = frame[y];
        const t = Math.max(0, Math.min(1, (db - minDb) / dbRange));
        const lutIdx = (t * 255) | 0; // fast floor
        const li = lutIdx * 3;
        // Flip Y so low frequencies are at bottom
        const destY = numBins - 1 - y;
        const idx = (destY * numFrames + x) * 4;
        pixels[idx] = lut[li];
        pixels[idx + 1] = lut[li + 1];
        pixels[idx + 2] = lut[li + 2];
        pixels[idx + 3] = 255;
      }
    }

    // Draw to offscreen canvas then scale
    const offscreen = document.createElement('canvas');
    offscreen.width = numFrames;
    offscreen.height = numBins;
    offscreen.getContext('2d')!.putImageData(imgData, 0, 0);

    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, 0, 0, width, height);

    // Draw frequency axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    const freqLabels = [100, 500, 1000, 2000, 5000, 10000, 20000];
    const nyquist = data.sampleRate / 2;
    for (const freq of freqLabels) {
      if (freq > nyquist) continue;
      const yRatio = 1 - freq / nyquist;
      const yPos = yRatio * height;
      ctx.fillText(`${freq >= 1000 ? `${freq / 1000}k` : freq}`, width - 4, yPos + 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(width - 30, yPos);
      ctx.stroke();
    }

    // Time axis labels
    ctx.textAlign = 'center';
    const totalDuration = data.times[data.times.length - 1] || 0;
    const timeLabels = 5;
    for (let i = 0; i <= timeLabels; i++) {
      const t = (i / timeLabels) * totalDuration;
      const x = (i / timeLabels) * width;
      ctx.fillText(`${t.toFixed(1)}s`, x, height - 4);
    }
  }, [data, width, height, lut, minDb, maxDb]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-md border border-border"
      style={{ imageRendering: 'auto' }}
    />
  );
}
