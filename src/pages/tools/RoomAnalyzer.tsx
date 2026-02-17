import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';

const tool = getToolById('room-analyzer')!;

const RoomAnalyzer = () => {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spectrum, setSpectrum] = useState<Float32Array | null>(null);
  const [noiseFloor, setNoiseFloor] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    return () => { stopCapture(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCapture = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    animRef.current = null;
    setRunning(false);
  }, []);

  const startCapture = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      streamRef.current = stream;
      setRunning(true);

      const freqData = new Float32Array(analyser.frequencyBinCount);

      const draw = () => {
        if (!analyserRef.current || !canvasRef.current) return;
        analyserRef.current.getFloatFrequencyData(freqData);
        setSpectrum(new Float32Array(freqData));

        // Estimate noise floor (median of bottom half)
        const sorted = [...freqData].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length * 0.25)];
        setNoiseFloor(Math.round(median));

        // Draw
        const canvas = canvasRef.current;
        const cCtx = canvas.getContext('2d')!;
        const w = canvas.width;
        const h = canvas.height;
        cCtx.fillStyle = getComputedStyle(canvas).getPropertyValue('--card') ? 'hsl(var(--card))' : '#1a1a2e';
        cCtx.fillRect(0, 0, w, h);

        const sr = ctx.sampleRate;
        const binCount = analyserRef.current.frequencyBinCount;

        // Draw grid
        cCtx.strokeStyle = 'rgba(255,255,255,0.1)';
        cCtx.lineWidth = 1;
        [100, 1000, 10000].forEach(freq => {
          const x = (Math.log10(freq / 20) / Math.log10(20000 / 20)) * w;
          cCtx.beginPath();
          cCtx.moveTo(x, 0);
          cCtx.lineTo(x, h);
          cCtx.stroke();
          cCtx.fillStyle = 'rgba(255,255,255,0.4)';
          cCtx.font = '10px sans-serif';
          cCtx.fillText(freq >= 1000 ? `${freq / 1000}k` : `${freq}`, x + 2, h - 4);
        });

        // Draw spectrum
        cCtx.beginPath();
        cCtx.strokeStyle = 'hsl(200, 80%, 60%)';
        cCtx.lineWidth = 1.5;

        for (let i = 1; i < binCount; i++) {
          const freq = (i * sr) / (analyserRef.current.fftSize);
          if (freq < 20 || freq > 20000) continue;
          const x = (Math.log10(freq / 20) / Math.log10(20000 / 20)) * w;
          const y = h - ((freqData[i] + 100) / 100) * h;
          if (i === 1) cCtx.moveTo(x, y);
          else cCtx.lineTo(x, y);
        }
        cCtx.stroke();

        animRef.current = requestAnimationFrame(draw);
      };

      animRef.current = requestAnimationFrame(draw);
    } catch (e: any) {
      setError(e.message || 'Microphone access denied');
    }
  }, []);

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={running ? stopCapture : startCapture}
              variant={running ? 'destructive' : 'default'}
              className="gap-2"
            >
              {running ? <><Square className="h-4 w-4" /> Stop</> : <><Mic className="h-4 w-4" /> Start Capture</>}
            </Button>
            {noiseFloor !== null && (
              <p className="text-sm text-muted-foreground">Noise floor: <span className="font-medium text-foreground">{noiseFloor} dBFS</span></p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <canvas
            ref={canvasRef}
            width={800}
            height={300}
            className="w-full rounded-md bg-card border border-border"
          />

          <p className="text-xs text-muted-foreground">
            Frequency response captured via microphone. Log scale, 20 Hz – 20 kHz. For accurate results, use a calibrated measurement microphone.
          </p>
        </div>
      </div>
    </ToolPage>
  );
};

export default RoomAnalyzer;
