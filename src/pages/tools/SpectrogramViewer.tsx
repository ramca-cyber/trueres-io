import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { SpectrogramCanvas } from '@/components/visualizations/SpectrogramCanvas';
import { VizToolbar } from '@/components/shared/VizToolbar';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT, COLORMAPS, type Colormap, formatFrequency } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { useVizViewport } from '@/hooks/use-viz-viewport';
import { type SpectrogramData, type BandwidthResult } from '@/types/analysis';

const tool = getToolById('spectrogram')!;

const SpectrogramViewer = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress, file } = useAudioFile();

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) loadFile(pending);
  }, []);
  const { runAnalysis, getResult } = useAnalysis();
  const [colormap, setColormap] = useState<Colormap>('magma');
  const [minDb, setMinDb] = useState(-120);
  const [maxDb, setMaxDb] = useState(0);
  const [showCeiling, setShowCeiling] = useState(true);
  const [showCdNyquist, setShowCdNyquist] = useState(true);

  const spectrogramData = getResult<SpectrogramData & { type: string; timestamp: number; duration: number }>('spectrogram');
  const bandwidthData = getResult<BandwidthResult>('bandwidth');

  useEffect(() => {
    if (pcm) {
      runAnalysis('spectrogram');
      runAnalysis('bandwidth');
    }
  }, [pcm, runAnalysis]);

  const viz = useVizViewport({ maxZoomX: 32, maxZoomY: 16 });
  const containerRef = useRef<HTMLDivElement>(null);

  const isHiRes = headerInfo && headerInfo.sampleRate > 48000;

  // Cursor label drawn on canvas — no React state
  const cursorLabel = useCallback((dataX: number, dataY: number) => {
    if (!spectrogramData) return '';
    const totalDuration = spectrogramData.times[spectrogramData.times.length - 1] || 0;
    const nyquist = spectrogramData.sampleRate / 2;
    const time = dataX * totalDuration;
    const freq = dataY * nyquist;
    return `${time.toFixed(2)}s / ${formatFrequency(freq)}`;
  }, [spectrogramData]);

  const toggles = useMemo(() => {
    const t = [];
    if (bandwidthData) {
      t.push({ id: 'show-ceiling', label: 'Bandwidth ceiling', checked: showCeiling, onChange: setShowCeiling });
    }
    if (isHiRes) {
      t.push({ id: 'show-cd', label: 'CD Nyquist', checked: showCdNyquist, onChange: setShowCdNyquist });
    }
    return t;
  }, [bandwidthData, isHiRes, showCeiling, showCdNyquist]);

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
          fileName={fileName}
          fileSize={fileSize}
          format={headerInfo?.format}
          duration={headerInfo?.duration}
          sampleRate={headerInfo?.sampleRate}
          bitDepth={headerInfo?.bitDepth}
          channels={headerInfo?.channels}
        />
        {file && <AudioPlayer src={file} label="Preview" />}

        {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." sublabel={`${decodeProgress}%`} />}

        {!spectrogramData && pcm && (
          <ProgressBar value={50} label="Computing spectrogram..." />
        )}

        {spectrogramData && (
          <div ref={containerRef} className="space-y-2 viz-fullscreen-container">
            <VizToolbar
              zoom={{ onIn: viz.zoomIn, onOut: viz.zoomOut, onReset: viz.reset, isZoomed: viz.isZoomed }}
              dbRange={{ min: minDb, max: maxDb, onMinChange: setMinDb, onMaxChange: setMaxDb }}
              colormap={{ value: colormap, onChange: (v) => setColormap(v as Colormap), options: COLORMAPS }}
              toggles={toggles}
              fullscreen={{ containerRef }}
              download={{ canvasRef: viz.canvasRef, filename: `${fileName}-spectrogram.png` }}
              onNewFile={() => useAudioStore.getState().clear()}
            />
            <SpectrogramCanvas
              data={spectrogramData as unknown as SpectrogramData}
              colormap={colormap}
              minDb={minDb}
              maxDb={maxDb}
              ceilingHz={showCeiling ? bandwidthData?.frequencyCeiling : undefined}
              showCdNyquist={showCdNyquist && !!isHiRes}
              viewport={viz.viewport}
              cursorRef={viz.cursorRef}
              cursorLabel={cursorLabel}
              canvasHandlers={viz.handlers}
              canvasRef={viz.canvasRef}
            />

            {bandwidthData && (
              <p className="text-xs text-muted-foreground">
                Bandwidth ceiling: <span className="font-mono font-medium text-foreground">{bandwidthData.frequencyCeiling >= 1000 ? `${(bandwidthData.frequencyCeiling / 1000).toFixed(1)} kHz` : `${Math.round(bandwidthData.frequencyCeiling)} Hz`}</span>
                {' · '}
                {bandwidthData.sourceGuess}
              </p>
            )}
            <p className={`text-xs text-muted-foreground ${viz.isZoomed ? '' : 'invisible'}`}>Scroll to zoom time · Shift+scroll to zoom freq · Drag to pan · Double-click to reset</p>
          </div>
        )}
      </div>
    </ToolPage>
  );
};

export default SpectrogramViewer;
