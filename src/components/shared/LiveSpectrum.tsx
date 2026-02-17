import { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface LiveSpectrumProps {
  analyserNode: AnalyserNode | null;
  className?: string;
  height?: number;
  barCount?: number;
}

export function LiveSpectrum({ analyserNode, className, height = 64, barCount = 48 }: LiveSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d')!;
    analyserNode.fftSize = 256;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Get CSS variables for colors
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryHSL = computedStyle.getPropertyValue('--primary').trim();

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      analyserNode!.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, rect.width, height);

      const barWidth = rect.width / barCount;
      const binsPerBar = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        // Average bins for this bar
        let sum = 0;
        for (let j = 0; j < binsPerBar; j++) {
          sum += dataArray[i * binsPerBar + j];
        }
        const avg = sum / binsPerBar;
        const barHeight = (avg / 255) * height * 0.9;

        const intensity = avg / 255;
        const alpha = 0.3 + intensity * 0.7;

        ctx.fillStyle = `hsla(${primaryHSL}, ${alpha})`;
        ctx.fillRect(
          i * barWidth + 1,
          height - barHeight,
          barWidth - 2,
          barHeight,
        );
      }
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode, height, barCount]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full rounded-md', className)}
      style={{ height }}
    />
  );
}
