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

// Color palette generators
function magmaColor(t: number): [number, number, number] {
  const r = Math.round(255 * Math.min(1, t * 3.5 - 0.2));
  const g = Math.round(255 * Math.max(0, t * 2 - 0.6));
  const b = Math.round(255 * Math.min(1, Math.max(0, 0.4 + t * 1.5 - t * t * 1.2)));
  return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
}

function infernoColor(t: number): [number, number, number] {
  const r = Math.round(255 * Math.min(1, t * 3));
  const g = Math.round(255 * Math.max(0, t * 3 - 1));
  const b = Math.round(255 * Math.max(0, 0.5 - Math.abs(t - 0.35) * 2));
  return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
}

function viridisColor(t: number): [number, number, number] {
  const r = Math.round(255 * Math.max(0, Math.min(1, 0.27 + t * 0.7 - (1 - t) * 0.1)));
  const g = Math.round(255 * Math.min(1, 0.0 + t * 0.9));
  const b = Math.round(255 * Math.max(0, 0.33 + (0.5 - t) * 0.6));
  return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
}

function getColormap(name: string): (t: number) => [number, number, number] {
  switch (name) {
    case 'inferno': return infernoColor;
    case 'viridis': return viridisColor;
    case 'grayscale': return (t) => { const v = Math.round(t * 255); return [v, v, v]; };
    case 'plasma': return (t) => {
      const r = Math.round(255 * Math.min(1, t * 2.5));
      const g = Math.round(255 * Math.max(0, t * 2 - 0.8));
      const b = Math.round(255 * Math.max(0, 1 - t * 1.5));
      return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
    };
    default: return magmaColor;
  }
}

export function SpectrogramCanvas({
  data,
  width = 900,
  height = 400,
  colormap = 'magma',
  minDb = -120,
  maxDb = 0,
}: SpectrogramCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colormapFn = useMemo(() => getColormap(colormap), [colormap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.magnitudes.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numFrames = data.magnitudes.length;
    const numBins = data.magnitudes[0].length;

    // Create offscreen image
    const imgData = ctx.createImageData(numFrames, numBins);
    const pixels = imgData.data;

    for (let x = 0; x < numFrames; x++) {
      const frame = data.magnitudes[x];
      for (let y = 0; y < numBins; y++) {
        const db = frame[y];
        const t = Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)));
        const [r, g, b] = colormapFn(t);
        // Flip Y so low frequencies are at bottom
        const destY = numBins - 1 - y;
        const idx = (destY * numFrames + x) * 4;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
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
  }, [data, width, height, colormapFn, minDb, maxDb]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-md border border-border"
      style={{ imageRendering: 'auto' }}
    />
  );
}
