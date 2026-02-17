import { useRef, useEffect } from 'react';
import { type SpectrumData } from '@/types/analysis';

interface SpectrumCanvasProps {
  data: SpectrumData;
  width?: number;
  height?: number;
  showOctaveBands?: boolean;
  lineColor?: string;
  bandColor?: string;
}

export function SpectrumCanvas({
  data,
  width = 900,
  height = 300,
  showOctaveBands = true,
  lineColor = 'hsl(40, 95%, 55%)',
  bandColor = 'hsl(40, 80%, 40%)',
}: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.magnitudes.length) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);

    const minDb = -100;
    const maxDb = 0;
    const dbRange = maxDb - minDb;
    const paddingLeft = 40;
    const paddingBottom = 30;
    const paddingTop = 10;
    const plotW = width - paddingLeft - 10;
    const plotH = height - paddingBottom - paddingTop;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px monospace';
    ctx.lineWidth = 1;

    // dB grid lines
    ctx.textAlign = 'right';
    for (let db = minDb; db <= maxDb; db += 20) {
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
    const maxFreq = data.frequencies[data.frequencies.length - 1] || 22050;
    const minFreq = Math.max(20, data.frequencies[1] || 20);

    for (const freq of freqLabels) {
      if (freq < minFreq || freq > maxFreq) continue;
      const x = paddingLeft + plotW * (Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq));
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
        const x = paddingLeft + plotW * (Math.log10(band.center / minFreq) / Math.log10(maxFreq / minFreq));
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
      if (freq < minFreq || freq > maxFreq) continue;
      const x = paddingLeft + plotW * (Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq));
      const y = paddingTop + plotH * (1 - (Math.max(minDb, Math.min(maxDb, data.magnitudes[i])) - minDb) / dbRange);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [data, width, height, showOctaveBands, lineColor, bandColor]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-md border border-border"
    />
  );
}
