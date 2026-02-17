import { useRef, useEffect } from 'react';
import { type WaveformData } from '@/types/analysis';

interface WaveformCanvasProps {
  data: WaveformData;
  width?: number;
  height?: number;
  peakColor?: string;
  rmsColor?: string;
  backgroundColor?: string;
  channel?: number;
}

export function WaveformCanvas({
  data,
  width = 900,
  height = 200,
  peakColor = 'hsl(40, 95%, 55%)',
  rmsColor = 'hsl(40, 80%, 40%)',
  backgroundColor = 'transparent',
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.peaks.length) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const midY = height / 2;
    const numBuckets = data.peaks.length;
    const pxPerBucket = width / numBuckets;

    // Background
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    // Draw center line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Draw peak waveform (mirrored)
    ctx.fillStyle = peakColor;
    for (let i = 0; i < numBuckets; i++) {
      const x = i * pxPerBucket;
      const peakH = data.peaks[i] * midY;
      ctx.fillRect(x, midY - peakH, Math.max(1, pxPerBucket - 0.5), peakH * 2);
    }

    // Draw RMS overlay
    ctx.fillStyle = rmsColor;
    for (let i = 0; i < numBuckets; i++) {
      const x = i * pxPerBucket;
      const rmsH = data.rms[i] * midY;
      ctx.fillRect(x, midY - rmsH, Math.max(1, pxPerBucket - 0.5), rmsH * 2);
    }

    // dB scale labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px monospace';
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
  }, [data, width, height, peakColor, rmsColor, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-md border border-border"
    />
  );
}
