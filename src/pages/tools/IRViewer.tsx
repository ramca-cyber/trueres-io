import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { MetricCard } from '@/components/display/MetricCard';
import { VizToolbar } from '@/components/shared/VizToolbar';
import { useVizViewport } from '@/hooks/use-viz-viewport';

const tool = getToolById('ir-viewer')!;

const IRViewer = () => {
  const [fileName, setFileName] = useState('');
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [rt60, setRt60] = useState<number | null>(null);

  const waveViz = useVizViewport({ lockY: true, maxZoomX: 64 });
  const freqViz = useVizViewport({ maxZoomX: 32, maxZoomY: 8 });
  const waveContainerRef = useRef<HTMLDivElement>(null);
  const freqContainerRef = useRef<HTMLDivElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    const ctx = new AudioContext();
    const arrayBuf = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    setBuffer(decoded);

    const data = decoded.getChannelData(0);
    const blockSize = Math.floor(decoded.sampleRate / 100);
    const blocks = Math.floor(data.length / blockSize);
    const energyDb: number[] = [];
    for (let b = 0; b < blocks; b++) {
      let energy = 0;
      for (let i = b * blockSize; i < (b + 1) * blockSize; i++) {
        energy += data[i] * data[i];
      }
      energyDb.push(10 * Math.log10(energy / blockSize + 1e-15));
    }

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

  // Waveform paint — reads cursorRef in rAF overlay, not as dep
  useEffect(() => {
    const canvas = waveViz.canvasRef.current;
    if (!buffer || !canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width || 800;
    const h = canvas.height || 200;
    if (w === 0 || h === 0) return;

    ctx.fillStyle = 'hsl(0, 0%, 7%)';
    ctx.fillRect(0, 0, w, h);

    const data = buffer.getChannelData(0);
    const vp = waveViz.viewport;
    const startSample = Math.floor(vp.xMin * data.length);
    const endSample = Math.ceil(vp.xMax * data.length);
    const visibleLength = endSample - startSample;

    ctx.beginPath();
    ctx.strokeStyle = 'hsl(200, 80%, 60%)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x++) {
      const idx = startSample + Math.floor((x / w) * visibleLength);
      const y = (1 - data[idx]) * h / 2;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [buffer, waveViz.viewport]);

  // Freq response paint
  useEffect(() => {
    const canvas = freqViz.canvasRef.current;
    if (!buffer || !canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width || 800;
    const h = canvas.height || 250;
    if (w === 0 || h === 0) return;

    ctx.fillStyle = 'hsl(0, 0%, 7%)';
    ctx.fillRect(0, 0, w, h);

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

      const vp = freqViz.viewport;
      const logMin = Math.log10(20);
      const logMax = Math.log10(20000);
      const logRange = logMax - logMin;
      const viewLogMin = logMin + vp.xMin * logRange;
      const viewLogMax = logMin + vp.xMax * logRange;
      const viewLogRange = viewLogMax - viewLogMin;

      const dbMin = -100 + vp.yMin * 100;
      const dbMax = -100 + vp.yMax * 100;
      const dbRange = dbMax - dbMin;

      ctx.beginPath();
      ctx.strokeStyle = 'hsl(150, 70%, 55%)';
      ctx.lineWidth = 1.5;

      const sr = buffer.sampleRate;
      for (let i = 1; i < freqData.length; i++) {
        const freq = (i * sr) / analyser.fftSize;
        if (freq < Math.pow(10, viewLogMin) || freq > Math.pow(10, viewLogMax)) continue;
        const x = (Math.log10(freq) - viewLogMin) / viewLogRange * w;
        const y = h - ((freqData[i] - dbMin) / dbRange) * h;
        if (i === 1) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px sans-serif';
      [100, 1000, 10000].forEach(freq => {
        if (freq < Math.pow(10, viewLogMin) || freq > Math.pow(10, viewLogMax)) return;
        const x = (Math.log10(freq) - viewLogMin) / viewLogRange * w;
        ctx.fillText(freq >= 1000 ? `${freq / 1000}k` : `${freq}`, x + 2, h - 4);
      });
    });
  }, [buffer, freqViz.viewport]);

  // Crosshair overlays via rAF for both canvases
  useEffect(() => {
    const canvas = waveViz.canvasRef.current;
    if (!canvas) return;
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
      const cursor = waveViz.cursorRef.current;
      if (cursor && buffer) {
        const cx = cursor.normX * w;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.stroke();
        ctx.setLineDash([]);
        const time = cursor.dataX * buffer.duration;
        const label = `${(time * 1000).toFixed(1)} ms`;
        const fontSize = Math.round(11 * (window.devicePixelRatio || 1));
        ctx.font = `${fontSize}px monospace`;
        const metrics = ctx.measureText(label);
        const pad = 4 * (window.devicePixelRatio || 1);
        const textX = Math.min(cx + pad, w - metrics.width - pad);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(textX - 2, pad, metrics.width + 4, fontSize + 4);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(label, textX, pad + fontSize);
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    return () => { running = false; overlayCanvas?.remove(); };
  }, [buffer, waveViz.cursorRef]);

  useEffect(() => {
    const canvas = freqViz.canvasRef.current;
    if (!canvas) return;
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
      const cursor = freqViz.cursorRef.current;
      if (cursor) {
        const cx = cursor.normX * w;
        const cy = cursor.normY * h;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();
        ctx.setLineDash([]);
        const logMin = Math.log10(20);
        const logMax = Math.log10(20000);
        const freq = Math.pow(10, logMin + cursor.dataX * (logMax - logMin));
        const db = -100 + (1 - cursor.dataY) * 100;
        const label = `${freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : Math.round(freq)} Hz / ${db.toFixed(0)} dB`;
        const fontSize = Math.round(11 * (window.devicePixelRatio || 1));
        ctx.font = `${fontSize}px monospace`;
        const metrics = ctx.measureText(label);
        const pad = 4 * (window.devicePixelRatio || 1);
        const textX = Math.min(cx + pad, w - metrics.width - pad);
        const textY = Math.max(cy - pad, fontSize + pad);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(textX - 2, textY - fontSize, metrics.width + 4, fontSize + 4);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(label, textX, textY);
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    return () => { running = false; overlayCanvas?.remove(); };
  }, [freqViz.cursorRef]);

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
              <MetricCard label="RT60 (est.)" value={rt60 ? `${rt60.toFixed(2)}s` : 'N/A'} status={rt60 && rt60 < 0.5 ? 'pass' : rt60 && rt60 < 1 ? 'warn' : 'info'} />
            </div>

            <div ref={waveContainerRef} className="space-y-2">
              <h3 className="text-sm font-heading font-semibold">Waveform</h3>
              <VizToolbar
                zoom={{ onIn: waveViz.zoomIn, onOut: waveViz.zoomOut, onReset: waveViz.reset, isZoomed: waveViz.isZoomed }}
                fullscreen={{ containerRef: waveContainerRef }}
                download={{ canvasRef: waveViz.canvasRef, filename: `${fileName}-ir-waveform.png` }}
              />
              <div style={{ position: 'relative' }}>
                <canvas
                  ref={waveViz.canvasRef}
                  className="w-full rounded-md border border-border"
                  style={{ cursor: 'crosshair', height: '200px' }}
                  {...waveViz.handlers}
                />
              </div>
            </div>

            <div ref={freqContainerRef} className="space-y-2">
              <h3 className="text-sm font-heading font-semibold">Frequency Response</h3>
              <VizToolbar
                zoom={{ onIn: freqViz.zoomIn, onOut: freqViz.zoomOut, onReset: freqViz.reset, isZoomed: freqViz.isZoomed }}
                fullscreen={{ containerRef: freqContainerRef }}
                download={{ canvasRef: freqViz.canvasRef, filename: `${fileName}-ir-freq.png` }}
              />
              <div style={{ position: 'relative' }}>
                <canvas
                  ref={freqViz.canvasRef}
                  className="w-full rounded-md border border-border"
                  style={{ cursor: 'crosshair', height: '250px' }}
                  {...freqViz.handlers}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">File: {fileName}</p>
          </>
        )}
      </div>
    </ToolPage>
  );
};

export default IRViewer;
