import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LiveSpectrumProps {
  analyserNode: AnalyserNode | null;
  audioElement?: HTMLAudioElement | null;
  className?: string;
  height?: number;
  barCount?: number;
}

export function LiveSpectrum({ analyserNode, audioElement, className, height = 64, barCount = 48 }: LiveSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: height });

  // Observe container size instead of resizing every frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const initialW = canvas.clientWidth;
    if (initialW > 0) sizeRef.current.w = Math.floor(initialW);
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) sizeRef.current.w = Math.floor(w);
    });
    obs.observe(canvas);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d')!;
    analyserNode.fftSize = 256;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const computedStyle = getComputedStyle(document.documentElement);
    const primaryRaw = computedStyle.getPropertyValue('--primary').trim();
    const [pH, pS, pL] = primaryRaw.split(' ');

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      if (!canvas) return;

      const w = sizeRef.current.w;
      if (w <= 0) return;
      const dpr = window.devicePixelRatio || 1;

      const targetW = w * dpr;
      const targetH = height * dpr;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      analyserNode!.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, w, height);

      const barWidth = w / barCount;
      const binsPerBar = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < binsPerBar; j++) {
          sum += dataArray[i * binsPerBar + j];
        }
        const avg = sum / binsPerBar;
        const barHeight = (avg / 255) * height * 0.9;
        const alpha = 0.3 + (avg / 255) * 0.7;

        ctx.fillStyle = `hsla(${pH}, ${pS}, ${pL}, ${alpha})`;
        ctx.fillRect(i * barWidth + 1, height - barHeight, barWidth - 2, barHeight);
      }
    }

    function startLoop() { if (!rafRef.current) draw(); }
    function stopLoop() { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }

    const el = audioElement;
    if (el) {
      el.addEventListener('play', startLoop);
      el.addEventListener('pause', stopLoop);
      if (!el.paused) startLoop();
    } else {
      startLoop();
    }

    return () => {
      stopLoop();
      el?.removeEventListener('play', startLoop);
      el?.removeEventListener('pause', stopLoop);
    };
  }, [analyserNode, audioElement, height, barCount]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full rounded-md', className)}
      style={{ height }}
      role="img"
      aria-label="Live frequency spectrum visualization"
    />
  );
}
