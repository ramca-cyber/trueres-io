import { useRef, useEffect } from 'react';
import { type Viewport, type CursorData } from '@/hooks/use-viz-viewport';

interface LoudnessHistoryCanvasProps {
  shortTerm: number[];
  momentary?: number[];
  width?: number;
  height?: number;
  viewport?: Viewport;
  cursor?: CursorData | null;
  canvasHandlers?: Record<string, any>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function LoudnessHistoryCanvas({
  shortTerm,
  momentary,
  width = 900,
  height = 220,
  viewport,
  cursor,
  canvasHandlers,
  canvasRef: externalRef,
}: LoudnessHistoryCanvasProps) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const ref = externalRef || internalRef;

  useEffect(() => {
    const canvas = (ref as React.RefObject<HTMLCanvasElement>).current;
    if (!canvas || !shortTerm.length) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);

    const paddingLeft = 45;
    const paddingRight = 10;
    const paddingTop = 15;
    const paddingBottom = 25;
    const plotW = width - paddingLeft - paddingRight;
    const plotH = height - paddingTop - paddingBottom;

    // LUFS range from viewport Y
    const fullMinLufs = -60;
    const fullMaxLufs = 0;
    const lufsRange100 = fullMaxLufs - fullMinLufs;
    const minLufs = viewport ? fullMinLufs + viewport.yMin * lufsRange100 : fullMinLufs;
    const maxLufs = viewport ? fullMinLufs + viewport.yMax * lufsRange100 : fullMaxLufs;
    const range = maxLufs - minLufs;

    // Time range from viewport X
    const totalSamples = shortTerm.length;
    const startIdx = viewport ? Math.floor(viewport.xMin * totalSamples) : 0;
    const endIdx = viewport ? Math.ceil(viewport.xMax * totalSamples) : totalSamples;
    const visibleCount = endIdx - startIdx;

    const totalSeconds = shortTerm.length * 3; // 3s windows
    const viewStartTime = (startIdx / totalSamples) * totalSeconds;
    const viewEndTime = (endIdx / totalSamples) * totalSeconds;

    const toY = (v: number) => {
      const clamped = Math.max(minLufs, Math.min(maxLufs, v));
      return paddingTop + plotH * (1 - (clamped - minLufs) / range);
    };

    const toX = (i: number) => {
      return paddingLeft + ((i - startIdx) / (visibleCount - 1 || 1)) * plotW;
    };

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px monospace';
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

    // Time axis
    ctx.textAlign = 'center';
    const timeSteps = Math.min(6, visibleCount);
    for (let i = 0; i <= timeSteps; i++) {
      const x = paddingLeft + (i / timeSteps) * plotW;
      const t = viewStartTime + (i / timeSteps) * (viewEndTime - viewStartTime);
      ctx.fillText(`${t.toFixed(0)}s`, x, height - 5);
    }

    // Draw momentary (background, lighter)
    if (momentary && momentary.length > 0) {
      // Map momentary indices to visible range
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

    // Draw short-term (main line) - visible range only
    const visibleST = shortTerm.slice(startIdx, endIdx);
    const finite = visibleST.filter(isFinite);
    if (finite.length > 0) {
      // Fill area under curve
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

      // Line
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

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LUFS', paddingLeft + 4, paddingTop + 12);

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
  }, [shortTerm, momentary, width, height, viewport, cursor, ref]);

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-heading font-semibold">Loudness Over Time</h3>
      <canvas
        ref={ref as React.RefObject<HTMLCanvasElement>}
        className="w-full rounded-md border border-border"
        style={{ cursor: 'crosshair' }}
        {...canvasHandlers}
      />
    </div>
  );
}
