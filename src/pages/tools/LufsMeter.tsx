import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ToolPage } from '@/components/shared/ToolPage';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { MetricCard } from '@/components/display/MetricCard';
import { ComplianceBadge } from '@/components/display/ComplianceBadge';
import { LoudnessHistoryCanvas } from '@/components/visualizations/LoudnessHistoryCanvas';
import { VizToolbar } from '@/components/shared/VizToolbar';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { useVizViewport } from '@/hooks/use-viz-viewport';
import { type LUFSResult } from '@/types/analysis';

const tool = getToolById('lufs-meter')!;

const LufsMeter = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress, decodeError, file } = useAudioFile();

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) loadFile(pending);
  }, []);
  const { runAnalysis, getResult } = useAnalysis();
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!pcm) return;
    setAnalyzing(true);
    runAnalysis('lufs').then(() => setAnalyzing(false));
  }, [pcm, runAnalysis]);

  const lufs = getResult<LUFSResult>('lufs');

  const momentaryMax = lufs?.momentary?.length
    ? Math.max(...lufs.momentary.filter(isFinite))
    : null;

  const viz = useVizViewport({ maxZoomX: 32, maxZoomY: 8 });
  const containerRef = useRef<HTMLDivElement>(null);

  const cursorLabel = useCallback((dataX: number, dataY: number) => {
    if (!lufs) return '';
    const totalSeconds = lufs.shortTerm.length * 3;
    const time = dataX * totalSeconds;
    const lufsVal = -60 + (1 - dataY) * 60;
    return `${time.toFixed(1)}s / ${lufsVal.toFixed(1)} LUFS`;
  }, [lufs]);

  return (
    <ToolPage tool={tool}>
      {!fileName && (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={loadFile} label="Drop your audio file here" sublabel="WAV, FLAC, AIFF, MP3, OGG, AAC, M4A" />
      )}

      {fileName && (
        <div className="space-y-4">
          <FileInfoBar fileName={fileName} fileSize={fileSize} format={headerInfo?.format} duration={headerInfo?.duration} sampleRate={headerInfo?.sampleRate} bitDepth={headerInfo?.bitDepth} channels={headerInfo?.channels} />
          {file && <AudioPlayer src={file} label="Preview" />}

          {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." />}
          {decodeError && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{decodeError}</div>}
          {analyzing && !lufs && <ProgressBar value={50} label="Measuring loudness..." />}

          {lufs && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MetricCard label="Integrated LUFS" value={isFinite(lufs.integrated) ? `${lufs.integrated.toFixed(1)}` : '—'} subtext="Overall loudness" status={lufs.integrated > -10 ? 'warn' : lufs.integrated < -20 ? 'info' : 'pass'} />
                <MetricCard label="Sample Peak" value={isFinite(lufs.truePeak) ? `${lufs.truePeak.toFixed(1)} dBFS` : '—'} subtext="Per-sample max (not true peak)" status={lufs.truePeak > -1 ? 'fail' : 'pass'} />
                <MetricCard label="LRA" value={`${lufs.lra.toFixed(1)} LU`} subtext="Loudness Range" status="info" />
                <MetricCard label="Short-Term Max" value={lufs.shortTerm.length > 0 ? `${Math.max(...lufs.shortTerm.filter(isFinite)).toFixed(1)}` : '—'} subtext="LUFS (3s window)" status="neutral" />
                <MetricCard label="Momentary Max" value={momentaryMax !== null && isFinite(momentaryMax) ? `${momentaryMax.toFixed(1)}` : '—'} subtext="LUFS (400ms window)" status="neutral" />
              </div>

              {lufs.shortTerm.length > 1 && (
                <div ref={containerRef} className="space-y-2 viz-fullscreen-container">
                  <VizToolbar
                    zoom={{ onIn: viz.zoomIn, onOut: viz.zoomOut, onReset: viz.reset, isZoomed: viz.isZoomed }}
                    fullscreen={{ containerRef }}
                    download={{ canvasRef: viz.canvasRef, filename: `${fileName}-loudness.png` }}
                    onNewFile={() => useAudioStore.getState().clear()}
                  />
                  <LoudnessHistoryCanvas
                    shortTerm={lufs.shortTerm}
                    momentary={lufs.momentary}
                    viewport={viz.viewport}
                    cursorRef={viz.cursorRef}
                    cursorLabel={cursorLabel}
                    canvasHandlers={viz.handlers}
                    canvasRef={viz.canvasRef}
                  />
                  <p className={`text-xs text-muted-foreground ${viz.isZoomed ? '' : 'invisible'}`}>Scroll to zoom time · Shift+scroll to zoom LUFS · Drag to pan · Double-click to reset</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-heading font-semibold mb-2">Platform Compliance</h3>
                <ComplianceBadge integratedLufs={lufs.integrated} truePeakDb={lufs.truePeak} />
              </div>
            </>
          )}
        </div>
      )}
    </ToolPage>
  );
};

export default LufsMeter;
