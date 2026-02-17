import { useRef, useEffect } from 'react';

interface LoudnessHistoryCanvasProps {
  shortTerm: number[];
  momentary?: number[];
  width?: number;
  height?: number;
}

export function LoudnessHistoryCanvas({
  shortTerm,
  momentary,
  width = 900,
  height = 220,
}: LoudnessHistoryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
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

    const minLufs = -60;
    const maxLufs = 0;
    const range = maxLufs - minLufs;

    const toY = (v: number) => {
      const clamped = Math.max(minLufs, Math.min(maxLufs, v));
      return paddingTop + plotH * (1 - (clamped - minLufs) / range);
    };

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.lineWidth = 1;

    for (let db = minLufs; db <= maxLufs; db += 10) {
      const y = toY(db);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + plotW, y);
      ctx.stroke();
      ctx.fillText(`${db}`, paddingLeft - 4, y + 3);
    }

    // Time axis
    ctx.textAlign = 'center';
    const totalSeconds = shortTerm.length * 3; // 3s windows
    const timeSteps = Math.min(6, shortTerm.length);
    for (let i = 0; i <= timeSteps; i++) {
      const x = paddingLeft + (i / timeSteps) * plotW;
      const t = (i / timeSteps) * totalSeconds;
      ctx.fillText(`${t.toFixed(0)}s`, x, height - 5);
    }

    // Draw momentary (background, lighter)
    if (momentary && momentary.length > 0) {
      const finiteM = momentary.filter(isFinite);
      if (finiteM.length > 0) {
        ctx.strokeStyle = 'hsla(40, 80%, 55%, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < momentary.length; i++) {
          if (!isFinite(momentary[i])) continue;
          const x = paddingLeft + (i / (momentary.length - 1)) * plotW;
          const y = toY(momentary[i]);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // Draw short-term (main line)
    const finite = shortTerm.filter(isFinite);
    if (finite.length > 0) {
      // Fill area under curve
      ctx.fillStyle = 'hsla(40, 95%, 55%, 0.1)';
      ctx.beginPath();
      let firstX = paddingLeft;
      let started = false;
      for (let i = 0; i < shortTerm.length; i++) {
        if (!isFinite(shortTerm[i])) continue;
        const x = paddingLeft + (i / (shortTerm.length - 1)) * plotW;
        const y = toY(shortTerm[i]);
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
      for (let i = 0; i < shortTerm.length; i++) {
        if (!isFinite(shortTerm[i])) continue;
        const x = paddingLeft + (i / (shortTerm.length - 1)) * plotW;
        const y = toY(shortTerm[i]);
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
  }, [shortTerm, momentary, width, height]);

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-heading font-semibold">Loudness Over Time</h3>
      <canvas ref={canvasRef} className="w-full rounded-md border border-border" />
    </div>
  );
}
