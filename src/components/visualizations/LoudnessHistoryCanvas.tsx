import { useRef, useEffect, type RefObject } from 'react';
import { type Viewport, type CursorData } from '@/hooks/use-viz-viewport';

interface LoudnessHistoryCanvasProps {
  shortTerm: number[];
  momentary?: number[];
  viewport?: Viewport;
  cursorRef?: RefObject<CursorData | null>;
  cursorLabel?: (dataX: number, dataY: number) => string;
  canvasHandlers?: Record<string, any>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function LoudnessHistoryCanvas({
  shortTerm,
  momentary,
  viewport,
  cursorRef,
  cursorLabel,
  canvasHandlers,
  canvasRef: externalRef,
}: LoudnessHistoryCanvasProps) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const ref = externalRef || internalRef;
  const sizeRef = useRef({ w: 0, h: 0 });
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

  // Main paint
  useEffect(() => {
    const canvas = (ref as React.RefObject<HTMLCanvasElement>).current;
    if (!canvas || !shortTerm.length) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);

    const dpr = window.devicePixelRatio || 1;
    const paddingLeft = Math.round(45 * dpr);
    const paddingRight = Math.round(10 * dpr);
    const paddingTop = Math.round(15 * dpr);
    const paddingBottom = Math.round(25 * dpr);
    const plotW = width - paddingLeft - paddingRight;
    const plotH = height - paddingTop - paddingBottom;

    const fullMinLufs = -60;
    const fullMaxLufs = 0;
    const lufsRange100 = fullMaxLufs - fullMinLufs;
    const minLufs = viewport ? fullMinLufs + viewport.yMin * lufsRange100 : fullMinLufs;
    const maxLufs = viewport ? fullMinLufs + viewport.yMax * lufsRange100 : fullMaxLufs;
    const range = maxLufs - minLufs;

    const totalSamples = shortTerm.length;
    const startIdx = viewport ? Math.floor(viewport.xMin * totalSamples) : 0;
    const endIdx = viewport ? Math.ceil(viewport.xMax * totalSamples) : totalSamples;
    const visibleCount = endIdx - startIdx;

    const totalSeconds = shortTerm.length * 3;
    const viewStartTime = (startIdx / totalSamples) * totalSeconds;
    const viewEndTime = (endIdx / totalSamples) * totalSeconds;

    const toY = (v: number) => {
      const clamped = Math.max(minLufs, Math.min(maxLufs, v));
      return paddingTop + plotH * (1 - (clamped - minLufs) / range);
    };

    const fontSize = Math.round(9 * dpr);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'right';
    ctx.lineWidth = 1;

    const dbStep = range > 40 ? 10 : range > 20 ? 5 : 2;
    for (let db = Math.ceil(minLufs / dbStep) * dbStep; db <= maxLufs; db += dbStep) {
      const y = toY(db);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + plotW, y);
      ctx.stroke();
      ctx.fillText(`${db}`, paddingLeft - 4, y + 3);
    }

    ctx.textAlign = 'center';
    const timeSteps = Math.min(6, visibleCount);
    for (let i = 0; i <= timeSteps; i++) {
      const x = paddingLeft + (i / timeSteps) * plotW;
      const t = viewStartTime + (i / timeSteps) * (viewEndTime - viewStartTime);
      ctx.fillText(`${t.toFixed(0)}s`, x, height - Math.round(5 * dpr));
    }

    if (momentary && momentary.length > 0) {
      const mStart = Math.floor((startIdx / totalSamples) * momentary.length);
      const mEnd = Math.ceil((endIdx / totalSamples) * momentary.length);
      ctx.strokeStyle = 'hsla(40, 80%, 55%, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let started = false;
      for (let i = mStart; i < mEnd; i++) {
        if (!isFinite(momentary[i])) continue;
        const x = paddingLeft + ((i - mStart) / (mEnd - mStart - 1 || 1)) * plotW;
        const y = toY(momentary[i]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const visibleST = shortTerm.slice(startIdx, endIdx);
    const finite = visibleST.filter(isFinite);
    if (finite.length > 0) {
      ctx.fillStyle = 'hsla(40, 95%, 55%, 0.1)';
      ctx.beginPath();
      let firstX = paddingLeft;
      let started = false;
      for (let i = 0; i < visibleST.length; i++) {
        if (!isFinite(visibleST[i])) continue;
        const x = paddingLeft + (i / (visibleST.length - 1 || 1)) * plotW;
        const y = toY(visibleST[i]);
        if (!started) { ctx.moveTo(x, paddingTop + plotH); ctx.lineTo(x, y); firstX = x; started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(paddingLeft + plotW, paddingTop + plotH);
      ctx.lineTo(firstX, paddingTop + plotH);
      ctx.fill();

      ctx.strokeStyle = 'hsl(40, 95%, 55%)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      started = false;
      for (let i = 0; i < visibleST.length; i++) {
        if (!isFinite(visibleST[i])) continue;
        const x = paddingLeft + (i / (visibleST.length - 1 || 1)) * plotW;
        const y = toY(visibleST[i]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const labelFontSize = Math.round(10 * dpr);
    ctx.font = `${labelFontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('LUFS', paddingLeft + 4, paddingTop + 12);
  }, [shortTerm, momentary, viewport, ref, sizeRef.current.w, sizeRef.current.h]);

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
      const paddingLeft = Math.round(45 * dpr);
      const paddingRight = Math.round(10 * dpr);
      const paddingTop = Math.round(15 * dpr);
      const paddingBottom = Math.round(25 * dpr);
      const plotW = w - paddingLeft - paddingRight;
      const plotH = h - paddingTop - paddingBottom;

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
    <div className="space-y-1">
      <h3 className="text-sm font-heading font-semibold">Loudness Over Time</h3>
      <div className="viz-canvas-wrap" style={{ minHeight: '220px' }}>
        <canvas
          ref={ref as React.RefObject<HTMLCanvasElement>}
          className="viz-canvas rounded-md border border-border"
          style={{ cursor: 'crosshair' }}
          {...canvasHandlers}
        />
      </div>
    </div>
  );
}
