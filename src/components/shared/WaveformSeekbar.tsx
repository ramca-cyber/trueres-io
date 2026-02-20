import { useRef, useEffect, useState, useCallback } from 'react';
import { cn, formatTime } from '@/lib/utils';

interface WaveformSeekbarProps {
  audioElement: HTMLAudioElement | null;
  className?: string;
  height?: number;
}

/** Read a CSS custom property (space-separated HSL) and return a canvas-compatible hsl() string */
function resolveHSL(varName: string, alpha?: number): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const [h, s, l] = raw.split(' ');
  return alpha != null ? `hsla(${h}, ${s}, ${l}, ${alpha})` : `hsl(${h}, ${s}, ${l})`;
}

export function WaveformSeekbar({
  audioElement,
  className,
  height = 56,
}: WaveformSeekbarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const [hovering, setHovering] = useState(false);
  const [hoverX, setHoverX] = useState(0);
  const rafRef = useRef<number>(0);
  const srcRef = useRef('');

  // Observe container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const initialW = el.clientWidth;
    if (initialW > 0) setCanvasWidth(Math.floor(initialW));
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setCanvasWidth(Math.floor(w));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [!!audioElement]);

  // Decode audio to get peaks
  useEffect(() => {
    if (!audioElement?.src || audioElement.src === srcRef.current) return;
    srcRef.current = audioElement.src;

    const ctx = new AudioContext();
    fetch(audioElement.src)
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        const ch = decoded.getChannelData(0);
        const numBuckets = Math.min(canvasWidth, 400);
        const samplesPerBucket = Math.max(1, Math.floor(ch.length / numBuckets));
        const p = new Float32Array(numBuckets);
        for (let b = 0; b < numBuckets; b++) {
          const start = b * samplesPerBucket;
          const end = Math.min(start + samplesPerBucket, ch.length);
          let peak = 0;
          for (let i = start; i < end; i++) {
            const abs = Math.abs(ch[i]);
            if (abs > peak) peak = abs;
          }
          p[b] = peak;
        }
        setPeaks(p);
        ctx.close();
      })
      .catch(() => { ctx.close(); });
  }, [audioElement?.src, canvasWidth]);

  // Track time via rAF — only when playing
  useEffect(() => {
    if (!audioElement) return;

    const tick = () => {
      setCurrentTime(audioElement.currentTime);
      setDuration(audioElement.duration || 0);
      if (!audioElement.paused) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const onPlay = () => { rafRef.current = requestAnimationFrame(tick); };
    const onPause = () => { cancelAnimationFrame(rafRef.current); };
    const onSeeked = () => {
      setCurrentTime(audioElement.currentTime);
      setDuration(audioElement.duration || 0);
    };

    audioElement.addEventListener('play', onPlay);
    audioElement.addEventListener('pause', onPause);
    audioElement.addEventListener('seeked', onSeeked);
    audioElement.addEventListener('loadedmetadata', onSeeked);

    // Start loop if already playing
    if (!audioElement.paused) onPlay();
    else onSeeked();

    return () => {
      cancelAnimationFrame(rafRef.current);
      audioElement.removeEventListener('play', onPlay);
      audioElement.removeEventListener('pause', onPause);
      audioElement.removeEventListener('seeked', onSeeked);
      audioElement.removeEventListener('loadedmetadata', onSeeked);
    };
  }, [audioElement]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvasWidth;
    const h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const numBuckets = peaks.length;
    const barW = Math.max(1, (w / numBuckets) - 1);
    const progress = duration > 0 ? currentTime / duration : 0;
    const progressX = progress * w;
    const mid = h / 2;

    const barColorResolved = resolveHSL('--muted-foreground', 0.35);
    const progressColorResolved = resolveHSL('--primary');
    const playheadColorResolved = resolveHSL('--destructive');
    const fgColor = resolveHSL('--foreground');

    for (let i = 0; i < numBuckets; i++) {
      const x = (i / numBuckets) * w;
      const peakH = peaks[i] * mid * 0.9;
      ctx.fillStyle = x < progressX ? progressColorResolved : barColorResolved;
      ctx.fillRect(x, mid - peakH, barW, peakH * 2);
    }

    ctx.strokeStyle = playheadColorResolved;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, h);
    ctx.stroke();

    if (hovering) {
      ctx.strokeStyle = resolveHSL('--foreground', 0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, h);
      ctx.stroke();

      const hoverTime = duration > 0 ? (hoverX / w) * duration : 0;
      ctx.fillStyle = fgColor;
      ctx.font = '10px monospace';
      ctx.textAlign = hoverX > w / 2 ? 'right' : 'left';
      ctx.fillText(formatTime(hoverTime), hoverX > w / 2 ? hoverX - 4 : hoverX + 4, 12);
    }
  }, [peaks, canvasWidth, height, currentTime, duration, hovering, hoverX]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!audioElement || !duration) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    audioElement.currentTime = (x / rect.width) * duration;
  }, [audioElement, duration]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverX(e.clientX - rect.left);
  }, []);

  if (!audioElement) return null;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <canvas
        ref={canvasRef}
        className="w-full rounded-md cursor-pointer"
        style={{ height }}
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onMouseMove={handleMouseMove}
        role="img"
        aria-label="Audio waveform seekbar"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-0.5 px-0.5">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
