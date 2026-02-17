import { useRef, useEffect } from 'react';
import { type SpectrumData } from '@/types/analysis';
import { type Viewport, type CursorData } from '@/hooks/use-viz-viewport';

interface SpectrumCanvasProps {
  data: SpectrumData;
  width?: number;
  height?: number;
  showOctaveBands?: boolean;
  lineColor?: string;
  bandColor?: string;
  viewport?: Viewport;
  cursor?: CursorData | null;
  canvasHandlers?: Record<string, any>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function SpectrumCanvas({
  data,
  width = 900,
  height = 300,
  showOctaveBands = true,
  lineColor = 'hsl(40, 95%, 55%)',
  bandColor = 'hsl(40, 80%, 40%)',
  viewport,
  cursor,
  canvasHandlers,
  canvasRef: externalRef,
}: SpectrumCanvasProps) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const ref = externalRef || internalRef;

  useEffect(() => {
    const canvas = (ref as React.RefObject<HTMLCanvasElement>).current;
    if (!canvas || !data.magnitudes.length) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);

    // dB range from viewport Y (default -100..0)
    const fullMinDb = -100;
    const fullMaxDb = 0;
    const dbRange100 = fullMaxDb - fullMinDb;
    const minDb = viewport ? fullMinDb + (viewport.yMin * dbRange100) : fullMinDb;
    const maxDb = viewport ? fullMinDb + (viewport.yMax * dbRange100) : fullMaxDb;
    const dbRange = maxDb - minDb;

    const paddingLeft = 40;
    const paddingBottom = 30;
    const paddingTop = 10;
    const plotW = width - paddingLeft - 10;
    const plotH = height - paddingBottom - paddingTop;

    // Frequency range from viewport X (log scale)
    const fullMaxFreq = data.frequencies[data.frequencies.length - 1] || 22050;
    const fullMinFreq = Math.max(20, data.frequencies[1] || 20);
    const logMin = Math.log10(fullMinFreq);
    const logMax = Math.log10(fullMaxFreq);
    const logRange = logMax - logMin;

    const viewLogMin = viewport ? logMin + viewport.xMin * logRange : logMin;
    const viewLogMax = viewport ? logMin + viewport.xMax * logRange : logMax;
    const viewMinFreq = Math.pow(10, viewLogMin);
    const viewMaxFreq = Math.pow(10, viewLogMax);
    const viewLogRange = viewLogMax - viewLogMin;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px monospace';
    ctx.lineWidth = 1;

    // dB grid lines
    ctx.textAlign = 'right';
    const dbStep = dbRange > 60 ? 20 : dbRange > 30 ? 10 : 5;
    for (let db = Math.ceil(minDb / dbStep) * dbStep; db <= maxDb; db += dbStep) {
      const y = paddingTop + plotH * (1 - (db - minDb) / dbRange);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
      ctx.fillText(`${db}`, paddingLeft - 4, y + 3);
    }

    // Frequency grid lines (log scale)
    ctx.textAlign = 'center';
    const freqLabels = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    for (const freq of freqLabels) {
      if (freq < viewMinFreq || freq > viewMaxFreq) continue;
      const x = paddingLeft + plotW * (Math.log10(freq) - viewLogMin) / viewLogRange;
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + plotH);
      ctx.stroke();
      ctx.fillText(freq >= 1000 ? `${freq / 1000}k` : `${freq}`, x, height - 8);
    }

    // Draw octave bands if available
    if (showOctaveBands && data.octaveBands?.length) {
      ctx.fillStyle = bandColor;
      ctx.globalAlpha = 0.3;
      const bandWidth = plotW / data.octaveBands.length * 0.7;
      for (let i = 0; i < data.octaveBands.length; i++) {
        const band = data.octaveBands[i];
        if (band.center < viewMinFreq || band.center > viewMaxFreq) continue;
        const x = paddingLeft + plotW * (Math.log10(band.center) - viewLogMin) / viewLogRange;
        const barH = plotH * Math.max(0, (band.magnitude - minDb) / dbRange);
        ctx.fillRect(x - bandWidth / 2, paddingTop + plotH - barH, bandWidth, barH);
      }
      ctx.globalAlpha = 1;
    }

    // Draw fine spectrum line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for (let i = 1; i < data.frequencies.length; i++) {
      const freq = data.frequencies[i];
      if (freq < viewMinFreq || freq > viewMaxFreq) continue;
      const x = paddingLeft + plotW * (Math.log10(freq) - viewLogMin) / viewLogRange;
      const mag = Math.max(minDb, Math.min(maxDb, data.magnitudes[i]));
      const y = paddingTop + plotH * (1 - (mag - minDb) / dbRange);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Crosshair cursor
    if (cursor) {
      const cx = cursor.normX * width;
      const cy = cursor.normY * height;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, paddingTop);
      ctx.lineTo(cx, paddingTop + plotH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(paddingLeft, cy);
      ctx.lineTo(paddingLeft + plotW, cy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [data, width, height, showOctaveBands, lineColor, bandColor, viewport, cursor, ref]);

  return (
    <canvas
      ref={ref as React.RefObject<HTMLCanvasElement>}
      className="w-full rounded-md border border-border"
      style={{ cursor: 'crosshair' }}
      {...canvasHandlers}
    />
  );
}
