import { useRef, useEffect, type RefObject } from 'react';
import { type WaveformData } from '@/types/analysis';
import { type Viewport, type CursorData } from '@/hooks/use-viz-viewport';

interface WaveformCanvasProps {
  data: WaveformData;
  peakColor?: string;
  rmsColor?: string;
  backgroundColor?: string;
  viewport?: Viewport;
  cursorRef?: RefObject<CursorData | null>;
  cursorLabel?: (dataX: number, dataY: number) => string;
  canvasHandlers?: Record<string, any>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function WaveformCanvas({
  data,
  peakColor = 'hsl(40, 95%, 55%)',
  rmsColor = 'hsl(40, 80%, 40%)',
  backgroundColor = 'transparent',
  viewport,
  cursorRef,
  cursorLabel,
  canvasHandlers,
  canvasRef: externalRef,
}: WaveformCanvasProps) {
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

  // Main paint — no cursor dependency
  useEffect(() => {
    const canvas = (ref as React.RefObject<HTMLCanvasElement>).current;
    if (!canvas || !data.peaks.length) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d')!;

    const midY = height / 2;
    const numBuckets = data.peaks.length;

    const xMin = viewport?.xMin ?? 0;
    const xMax = viewport?.xMax ?? 1;
    const startBucket = Math.floor(xMin * numBuckets);
    const endBucket = Math.ceil(xMax * numBuckets);
    const visibleBuckets = endBucket - startBucket;
    const pxPerBucket = width / visibleBuckets;

    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    ctx.fillStyle = peakColor;
    for (let i = startBucket; i < endBucket; i++) {
      const x = (i - startBucket) * pxPerBucket;
      const peakH = data.peaks[i] * midY;
      ctx.fillRect(x, midY - peakH, Math.max(1, pxPerBucket - 0.5), peakH * 2);
    }

    ctx.fillStyle = rmsColor;
    for (let i = startBucket; i < endBucket; i++) {
      const x = (i - startBucket) * pxPerBucket;
      const rmsH = data.rms[i] * midY;
      ctx.fillRect(x, midY - rmsH, Math.max(1, pxPerBucket - 0.5), rmsH * 2);
    }

    // dB scale labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    const fontSize = Math.round(9 * (window.devicePixelRatio || 1));
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'left';
    const dbLevels = [0, -6, -12, -24, -48];
    for (const db of dbLevels) {
      const amp = Math.pow(10, db / 20);
      const y = midY - amp * midY;
      ctx.fillText(`${db}dB`, 2, y - 2);
      if (db !== 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
  }, [data, peakColor, rmsColor, backgroundColor, viewport, ref, sizeRef.current.w, sizeRef.current.h]);

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

      const cursor = cursorRef.current;
      if (cursor) {
        const cx = cursor.normX * w;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.stroke();
        ctx.setLineDash([]);

        if (cursorLabel) {
          const label = cursorLabel(cursor.dataX, cursor.dataY);
          const fontSize = Math.round(11 * (window.devicePixelRatio || 1));
          ctx.font = `${fontSize}px monospace`;
          const metrics = ctx.measureText(label);
          const pad = 4 * (window.devicePixelRatio || 1);
          const textX = Math.min(cx + pad, w - metrics.width - pad);
          const textY = fontSize + pad;
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
        style={{ cursor: 'crosshair', height: '200px' }}
        {...canvasHandlers}
      />
    </div>
  );
}
