import { useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ToolPage } from '@/components/shared/ToolPage';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { MetricCard } from '@/components/display/MetricCard';
import { SpectrumCanvas } from '@/components/visualizations/SpectrumCanvas';
import { VizToolbar } from '@/components/shared/VizToolbar';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT, formatFrequency } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { useVizViewport } from '@/hooks/use-viz-viewport';
import { type SpectrumData } from '@/types/analysis';

const tool = getToolById('spectrum-analyzer')!;

const SpectrumAnalyzer = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress, file } = useAudioFile();

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) loadFile(pending);
  }, []);
  const { runAnalysis, getResult } = useAnalysis();

  const spectrumData = getResult<SpectrumData & { type: string; timestamp: number; duration: number }>('spectrum');

  useEffect(() => {
    if (pcm) runAnalysis('spectrum');
  }, [pcm, runAnalysis]);

  const viz = useVizViewport({ maxZoomX: 32, maxZoomY: 8 });
  const containerRef = useRef<HTMLDivElement>(null);

  let peakFreq: number | null = null;
  let peakMag: number | null = null;
  if (spectrumData) {
    let maxVal = -Infinity;
    for (let i = 1; i < spectrumData.magnitudes.length; i++) {
      if (spectrumData.magnitudes[i] > maxVal) {
        maxVal = spectrumData.magnitudes[i];
        peakFreq = spectrumData.frequencies[i];
        peakMag = maxVal;
      }
    }
  }

  const cursorLabel = useCallback((dataX: number, dataY: number) => {
    if (!spectrumData) return '';
    const maxFreq = spectrumData.frequencies[spectrumData.frequencies.length - 1] || 22050;
    const minFreq = Math.max(20, spectrumData.frequencies[1] || 20);
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const freq = Math.pow(10, logMin + dataX * (logMax - logMin));
    const dbVal = -100 + (1 - dataY) * 100;
    return `${formatFrequency(freq)} / ${dbVal.toFixed(0)} dB`;
  }, [spectrumData]);

  if (!fileName) {
    return (
      <ToolPage tool={tool}>
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={loadFile} label="Drop your audio file here" sublabel="WAV, FLAC, AIFF, MP3, OGG, AAC, M4A" />
      </ToolPage>
    );
  }

  return (
    <ToolPage tool={tool}>
      <div className="space-y-4">
        <FileInfoBar fileName={fileName} fileSize={fileSize} format={headerInfo?.format} duration={headerInfo?.duration} sampleRate={headerInfo?.sampleRate} bitDepth={headerInfo?.bitDepth} channels={headerInfo?.channels} />
        {file && <AudioPlayer src={file} label="Preview" />}
        {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." sublabel={`${decodeProgress}%`} />}
        {!spectrumData && pcm && <ProgressBar value={50} label="Computing spectrum..." />}

        {spectrumData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard label="Peak Frequency" value={peakFreq !== null ? formatFrequency(peakFreq) : '—'} subtext="Dominant frequency" status="info" />
              <MetricCard label="Peak Magnitude" value={peakMag !== null ? `${peakMag.toFixed(1)} dB` : '—'} subtext="At peak frequency" status="neutral" />
              <MetricCard label="Nyquist" value={headerInfo?.sampleRate ? formatFrequency(headerInfo.sampleRate / 2) : '—'} subtext="Maximum representable freq" status="neutral" />
            </div>
            <div ref={containerRef} className="space-y-2 viz-fullscreen-container">
              <VizToolbar
                zoom={{ onIn: viz.zoomIn, onOut: viz.zoomOut, onReset: viz.reset, isZoomed: viz.isZoomed }}
                fullscreen={{ containerRef }}
                download={{ canvasRef: viz.canvasRef, filename: `${fileName}-spectrum.png` }}
              />
              <SpectrumCanvas
                data={spectrumData as unknown as SpectrumData}
                viewport={viz.viewport}
                cursorRef={viz.cursorRef}
                cursorLabel={cursorLabel}
                canvasHandlers={viz.handlers}
                canvasRef={viz.canvasRef}
              />
              <p className={`text-xs text-muted-foreground ${viz.isZoomed ? '' : 'invisible'}`}>Scroll to zoom freq · Shift+scroll to zoom dB · Drag to pan · Double-click to reset</p>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => useAudioStore.getState().clear()}>
            Analyze another file
          </Button>
        </div>
      </div>
    </ToolPage>
  );
};

export default SpectrumAnalyzer;
