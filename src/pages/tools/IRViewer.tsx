import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { MetricCard } from '@/components/display/MetricCard';

const tool = getToolById('ir-viewer')!;

const IRViewer = () => {
  const [fileName, setFileName] = useState('');
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [rt60, setRt60] = useState<number | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    const ctx = new AudioContext();
    const arrayBuf = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    setBuffer(decoded);

    // Estimate RT60 from energy decay
    const data = decoded.getChannelData(0);
    const blockSize = Math.floor(decoded.sampleRate / 100); // 10ms blocks
    const blocks = Math.floor(data.length / blockSize);
    const energyDb: number[] = [];
    for (let b = 0; b < blocks; b++) {
      let energy = 0;
      for (let i = b * blockSize; i < (b + 1) * blockSize; i++) {
        energy += data[i] * data[i];
      }
      energyDb.push(10 * Math.log10(energy / blockSize + 1e-15));
    }

    // Find peak and measure time to -60dB
    const peakIdx = energyDb.indexOf(Math.max(...energyDb));
    const peakDb = energyDb[peakIdx];
    const target = peakDb - 60;
    let rt60Estimate: number | null = null;
    for (let i = peakIdx; i < energyDb.length; i++) {
      if (energyDb[i] <= target) {
        rt60Estimate = ((i - peakIdx) * blockSize) / decoded.sampleRate;
        break;
      }
    }
    // If didn't reach -60, extrapolate from -20 (T20)
    if (rt60Estimate === null) {
      const t20Target = peakDb - 20;
      for (let i = peakIdx; i < energyDb.length; i++) {
        if (energyDb[i] <= t20Target) {
          rt60Estimate = (((i - peakIdx) * blockSize) / decoded.sampleRate) * 3;
          break;
        }
      }
    }
    setRt60(rt60Estimate);
    ctx.close();
  }, []);

  // Draw waveform
  useEffect(() => {
    if (!buffer || !waveCanvasRef.current) return;
    const canvas = waveCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / w));

    ctx.beginPath();
    ctx.strokeStyle = 'hsl(200, 80%, 60%)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x++) {
      const idx = x * step;
      const y = (1 - data[idx]) * h / 2;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [buffer]);

  // Draw frequency response
  useEffect(() => {
    if (!buffer || !freqCanvasRef.current) return;
    const canvas = freqCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // FFT via OfflineAudioContext
    const offCtx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    const source = offCtx.createBufferSource();
    const analyser = offCtx.createAnalyser();
    analyser.fftSize = 4096;
    source.buffer = buffer;
    source.connect(analyser).connect(offCtx.destination);
    source.start();
    offCtx.startRendering().then(() => {
      const freqData = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(freqData);

      ctx.beginPath();
      ctx.strokeStyle = 'hsl(150, 70%, 55%)';
      ctx.lineWidth = 1.5;

      const sr = buffer.sampleRate;
      for (let i = 1; i < freqData.length; i++) {
        const freq = (i * sr) / analyser.fftSize;
        if (freq < 20 || freq > 20000) continue;
        const x = (Math.log10(freq / 20) / Math.log10(20000 / 20)) * w;
        const y = h - ((freqData[i] + 100) / 100) * h;
        if (i === 1) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Labels
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px sans-serif';
      [100, 1000, 10000].forEach(freq => {
        const x = (Math.log10(freq / 20) / Math.log10(20000 / 20)) * w;
        ctx.fillText(freq >= 1000 ? `${freq / 1000}k` : `${freq}`, x + 2, h - 4);
      });
    });
  }, [buffer]);

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        <FileDropZone
          onFileSelect={handleFile}
          accept=".wav,.flac,.aiff"
          label="Drop an impulse response file (WAV, FLAC, AIFF)"
        />

        {buffer && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Duration" value={`${(buffer.duration * 1000).toFixed(0)} ms`} />
              <MetricCard label="Sample Rate" value={`${buffer.sampleRate} Hz`} />
              <MetricCard label="Channels" value={String(buffer.numberOfChannels)} />
              <MetricCard
                label="RT60 (est.)"
                value={rt60 ? `${rt60.toFixed(2)}s` : 'N/A'}
                status={rt60 && rt60 < 0.5 ? 'pass' : rt60 && rt60 < 1 ? 'warn' : 'info'}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-heading font-semibold">Waveform</h3>
              <canvas ref={waveCanvasRef} width={800} height={200} className="w-full rounded-md border border-border" />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-heading font-semibold">Frequency Response</h3>
              <canvas ref={freqCanvasRef} width={800} height={250} className="w-full rounded-md border border-border" />
            </div>

            <p className="text-xs text-muted-foreground">File: {fileName}</p>
          </>
        )}
      </div>
    </ToolPage>
  );
};

export default IRViewer;
