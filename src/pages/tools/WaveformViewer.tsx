import { useEffect, useMemo, useRef } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { MetricCard } from '@/components/display/MetricCard';
import { WaveformCanvas } from '@/components/visualizations/WaveformCanvas';
import { VizToolbar } from '@/components/shared/VizToolbar';
import { Button } from '@/components/ui/button';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { useVizViewport } from '@/hooks/use-viz-viewport';
import { type WaveformData } from '@/types/analysis';

const tool = getToolById('waveform-viewer')!;

const WaveformViewer = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress, file } = useAudioFile();

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) loadFile(pending);
  }, []);
  const { runAnalysis, getResult } = useAnalysis();

  const waveformData = getResult<WaveformData & { type: string; timestamp: number; duration: number }>('waveform');

  useEffect(() => {
    if (pcm) runAnalysis('waveform');
  }, [pcm, runAnalysis]);

  const viz = useVizViewport({ lockY: true, maxZoomX: 64 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute peak from waveform data
  const peakLevel = waveformData
    ? Math.max(...Array.from(waveformData.peaks))
    : null;
  const peakDb = peakLevel && peakLevel > 0 ? 20 * Math.log10(peakLevel) : null;

  // Cursor readout
  const cursorReadout = useMemo(() => {
    if (!viz.cursor || !waveformData || !headerInfo?.duration) return undefined;
    const time = viz.cursor.dataX * headerInfo.duration;
    // Find amplitude at cursor position
    const bucketIdx = Math.floor(viz.cursor.dataX * waveformData.peaks.length);
    const amp = waveformData.peaks[Math.min(bucketIdx, waveformData.peaks.length - 1)] || 0;
    const db = amp > 0 ? (20 * Math.log10(amp)).toFixed(1) : '-∞';
    return `${time.toFixed(2)}s / ${db} dBFS`;
  }, [viz.cursor, waveformData, headerInfo?.duration]);

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
        <FileInfoBar
          fileName={fileName} fileSize={fileSize}
          format={headerInfo?.format} duration={headerInfo?.duration}
          sampleRate={headerInfo?.sampleRate} bitDepth={headerInfo?.bitDepth}
          channels={headerInfo?.channels}
        />
        {file && <AudioPlayer src={file} label="Preview" />}

        {waveformData && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard
              label="Duration"
              value={headerInfo?.duration ? `${headerInfo.duration.toFixed(1)}s` : '—'}
              subtext="Total length"
              status="neutral"
            />
            <MetricCard
              label="Peak Level"
              value={peakDb !== null ? `${peakDb.toFixed(1)} dBFS` : '—'}
              subtext={peakDb !== null && peakDb > -0.3 ? 'Near clipping' : 'Maximum amplitude'}
              status={peakDb !== null && peakDb > -0.3 ? 'warn' : 'pass'}
            />
            <MetricCard
              label="Channels"
              value={headerInfo?.channels === 2 ? 'Stereo' : headerInfo?.channels === 1 ? 'Mono' : `${headerInfo?.channels ?? '?'}ch`}
              subtext={`${headerInfo?.channels ?? '?'} channel(s)`}
              status="info"
            />
          </div>
        )}

        {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." sublabel={`${decodeProgress}%`} />}
        {!waveformData && pcm && <ProgressBar value={50} label="Computing waveform..." />}

        {waveformData && (
          <div ref={containerRef} className="space-y-2">
            <VizToolbar
              zoom={{ onIn: viz.zoomIn, onOut: viz.zoomOut, onReset: viz.reset, isZoomed: viz.isZoomed }}
              cursorReadout={cursorReadout}
              fullscreen={{ containerRef }}
              download={{ canvasRef: viz.canvasRef, filename: `${fileName}-waveform.png` }}
            />
            <WaveformCanvas
              data={waveformData as WaveformData}
              viewport={viz.viewport}
              cursor={viz.cursor}
              canvasHandlers={viz.handlers}
              canvasRef={viz.canvasRef}
            />
            {viz.isZoomed && (
              <p className="text-xs text-muted-foreground">Scroll to zoom · Drag to pan · Double-click to reset</p>
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

export default WaveformViewer;
