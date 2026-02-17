import { useRef, useEffect } from 'react';

interface LiveSpectrogramProps {
  analyserNode: AnalyserNode;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Scrolling real-time spectrogram visualization from an AnalyserNode.
 * Each animation frame draws a 1px column representing frequency magnitudes.
 */
export function LiveSpectrogram({
  analyserNode,
  width = 600,
  height = 120,
  className,
}: LiveSpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const actualWidthRef = useRef(width);

  // Track container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) actualWidthRef.current = Math.floor(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fftSize = analyserNode.fftSize;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Color map: dark blue → cyan → yellow → red → white
    function valueToColor(v: number): string {
      const t = v / 255;
      if (t < 0.2) {
        const s = t / 0.2;
        return `rgb(${Math.floor(s * 20)}, ${Math.floor(s * 20)}, ${Math.floor(40 + s * 80)})`;
      } else if (t < 0.5) {
        const s = (t - 0.2) / 0.3;
        return `rgb(${Math.floor(20 + s * 20)}, ${Math.floor(20 + s * 200)}, ${Math.floor(120 + s * 80)})`;
      } else if (t < 0.75) {
        const s = (t - 0.5) / 0.25;
        return `rgb(${Math.floor(40 + s * 215)}, ${Math.floor(220 - s * 50)}, ${Math.floor(200 - s * 170)})`;
      } else {
        const s = (t - 0.75) / 0.25;
        return `rgb(255, ${Math.floor(170 + s * 85)}, ${Math.floor(30 + s * 225)})`;
      }
    }

    const draw = () => {
      const w = actualWidthRef.current;
      const h = height;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.scale(dpr, dpr);
        ctx.fillStyle = 'hsl(0, 0%, 5%)';
        ctx.fillRect(0, 0, w, h);
      }

      analyserNode.getByteFrequencyData(dataArray);

      // Shift canvas left by 1px
      const imageData = ctx.getImageData(dpr, 0, (w - 1) * dpr, h * dpr);
      ctx.putImageData(imageData, 0, 0);

      // Draw new column at right edge
      const binHeight = h / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        // Map low frequencies to bottom
        const y = h - (i + 1) * binHeight;
        ctx.fillStyle = valueToColor(dataArray[i]);
        ctx.fillRect(w - 1, y, 1, Math.max(1, binHeight));
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode, height]);

  return (
    <div ref={containerRef} className={className}>
      <canvas
        ref={canvasRef}
        className="w-full rounded-md border border-border"
        style={{ height }}
      />
    </div>
  );
}
