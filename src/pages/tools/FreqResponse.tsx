import { useEffect, useCallback, useRef } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
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
import { Button } from '@/components/ui/button';

const tool = getToolById('freq-response')!;

const FreqResponse = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress } = useAudioFile();

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
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={loadFile} label="Drop measurement file here" sublabel="Use a sweep recording to plot frequency response" />
      </ToolPage>
    );
  }

  return (
    <ToolPage tool={tool}>
      <div className="space-y-4">
        <FileInfoBar fileName={fileName} fileSize={fileSize} format={headerInfo?.format} duration={headerInfo?.duration} sampleRate={headerInfo?.sampleRate} bitDepth={headerInfo?.bitDepth} />
        {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." sublabel={`${decodeProgress}%`} />}
        {!spectrumData && pcm && <ProgressBar value={50} label="Computing frequency response..." />}
        {spectrumData && (
          <div ref={containerRef} className="space-y-2 viz-fullscreen-container">
            <h3 className="text-sm font-medium">Frequency Response Curve</h3>
            <p className="text-xs text-muted-foreground">
              For best results, use a logarithmic sweep recording captured through your audio chain.
            </p>
            <VizToolbar
              zoom={{ onIn: viz.zoomIn, onOut: viz.zoomOut, onReset: viz.reset, isZoomed: viz.isZoomed }}
              fullscreen={{ containerRef }}
              download={{ canvasRef: viz.canvasRef, filename: `${fileName}-freq-response.png` }}
            />
            <SpectrumCanvas
              data={spectrumData as unknown as SpectrumData}
              showOctaveBands={false}
              viewport={viz.viewport}
              cursorRef={viz.cursorRef}
              cursorLabel={cursorLabel}
              canvasHandlers={viz.handlers}
              canvasRef={viz.canvasRef}
            />
            {viz.isZoomed && (
              <p className="text-xs text-muted-foreground">Scroll to zoom freq · Shift+scroll to zoom dB · Drag to pan · Double-click to reset</p>
            )}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => useAudioStore.getState().clear()}>
          Analyze another file
        </Button>
      </div>
    </ToolPage>
  );
};

export default FreqResponse;
