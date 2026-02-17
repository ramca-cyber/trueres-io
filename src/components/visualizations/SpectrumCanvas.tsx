import { useRef, useEffect, useState, type RefObject } from 'react';
import { type SpectrumData } from '@/types/analysis';
import { type Viewport, type CursorData } from '@/hooks/use-viz-viewport';

interface SpectrumCanvasProps {
  data: SpectrumData;
  showOctaveBands?: boolean;
  lineColor?: string;
  bandColor?: string;
  viewport?: Viewport;
  cursorRef?: RefObject<CursorData | null>;
  cursorLabel?: (dataX: number, dataY: number) => string;
  canvasHandlers?: Record<string, any>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function SpectrumCanvas({
  data,
  showOctaveBands = true,
  lineColor = 'hsl(40, 95%, 55%)',
  bandColor = 'hsl(40, 80%, 40%)',
  viewport,
  cursorRef,
  cursorLabel,
  canvasHandlers,
  canvasRef: externalRef,
}: SpectrumCanvasProps) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const ref = externalRef || internalRef;
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const rafRef = useRef<number>(0);

  // ResizeObserver
  useEffect(() => {
    const canvas = (ref as React.RefObject<HTMLCanvasElement>).current;
    if (!canvas) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const dpr = window.devicePixelRatio || 1;
        const w = Math.round(entry.contentRect.width * dpr);
        const h = Math.round(entry.contentRect.height * dpr);
        if (w > 0 && h > 0) {
          canvas.width = w;
          canvas.height = h;
          setCanvasSize({ w, h });
        }
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [ref]);

  // Main paint
  useEffect(() => {
    const canvas = (ref as React.RefObject<HTMLCanvasElement>).current;
    if (!canvas || !data.magnitudes.length) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);

    const fullMinDb = -100;
    const fullMaxDb = 0;
    const dbRange100 = fullMaxDb - fullMinDb;
    const minDb = viewport ? fullMinDb + (viewport.yMin * dbRange100) : fullMinDb;
    const maxDb = viewport ? fullMinDb + (viewport.yMax * dbRange100) : fullMaxDb;
    const dbRange = maxDb - minDb;

    const dpr = window.devicePixelRatio || 1;
    const paddingLeft = Math.round(40 * dpr);
    const paddingBottom = Math.round(30 * dpr);
    const paddingTop = Math.round(10 * dpr);
    const paddingRight = Math.round(10 * dpr);
    const plotW = width - paddingLeft - paddingRight;
    const plotH = height - paddingBottom - paddingTop;

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

    const fontSize = Math.round(9 * dpr);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${fontSize}px monospace`;
    ctx.lineWidth = 1;

    ctx.textAlign = 'right';
    const dbStep = dbRange > 60 ? 20 : dbRange > 30 ? 10 : 5;
    for (let db = Math.ceil(minDb / dbStep) * dbStep; db <= maxDb; db += dbStep) {
      const y = paddingTop + plotH * (1 - (db - minDb) / dbRange);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
      ctx.fillText(`${db}`, paddingLeft - 4, y + 3);
    }

    ctx.textAlign = 'center';
    const freqLabels = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    for (const freq of freqLabels) {
      if (freq < viewMinFreq || freq > viewMaxFreq) continue;
      const x = paddingLeft + plotW * (Math.log10(freq) - viewLogMin) / viewLogRange;
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + plotH);
      ctx.stroke();
      ctx.fillText(freq >= 1000 ? `${freq / 1000}k` : `${freq}`, x, height - Math.round(8 * dpr));
    }

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
  }, [data, showOctaveBands, lineColor, bandColor, viewport, ref, canvasSize.w, canvasSize.h]);

  // Crosshair overlay via rAF
  useEffect(() => {
    const canvas = (ref as React.RefObject<HTMLCanvasElement>).current;
    if (!canvas || !cursorRef) return;

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

      const dpr = window.devicePixelRatio || 1;
      const paddingLeft = Math.round(40 * dpr);
      const paddingTop = Math.round(10 * dpr);
      const paddingRight = Math.round(10 * dpr);
      const paddingBottom = Math.round(30 * dpr);
      const plotW = w - paddingLeft - paddingRight;
      const plotH = h - paddingBottom - paddingTop;

      const cursor = cursorRef.current;
      if (cursor) {
        const cx = cursor.normX * w;
        const cy = cursor.normY * h;
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

        if (cursorLabel) {
          const label = cursorLabel(cursor.dataX, cursor.dataY);
          const fontSize = Math.round(11 * dpr);
          ctx.font = `${fontSize}px monospace`;
          const metrics = ctx.measureText(label);
          const pad = 4 * dpr;
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
    <div className="viz-canvas-wrap" style={{ minHeight: '300px' }}>
      <canvas
        ref={ref as React.RefObject<HTMLCanvasElement>}
        className="viz-canvas rounded-md border border-border"
        style={{ cursor: 'crosshair' }}
        {...canvasHandlers}
      />
    </div>
  );
}
