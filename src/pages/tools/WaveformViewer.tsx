import { useEffect, useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { MetricCard } from '@/components/display/MetricCard';
import { WaveformCanvas } from '@/components/visualizations/WaveformCanvas';
import { Button } from '@/components/ui/button';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { type WaveformData } from '@/types/analysis';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const tool = getToolById('waveform-viewer')!;

const ZOOM_LEVELS = [1, 2, 4, 8, 16];

const WaveformViewer = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress } = useAudioFile();
  const { runAnalysis, getResult } = useAnalysis();
  const [zoomIdx, setZoomIdx] = useState(0);

  const waveformData = getResult<WaveformData & { type: string; timestamp: number; duration: number }>('waveform');

  useEffect(() => {
    if (pcm) runAnalysis('waveform');
  }, [pcm, runAnalysis]);

  // Compute peak from waveform data
  const peakLevel = waveformData
    ? Math.max(...Array.from(waveformData.peaks))
    : null;
  const peakDb = peakLevel && peakLevel > 0 ? 20 * Math.log10(peakLevel) : null;

  // Zoom: slice waveform data
  const zoom = ZOOM_LEVELS[zoomIdx];
  const zoomedData = waveformData && zoom > 1
    ? {
        peaks: waveformData.peaks.slice(0, Math.ceil(waveformData.peaks.length / zoom)),
        rms: waveformData.rms.slice(0, Math.ceil(waveformData.rms.length / zoom)),
        samplesPerPixel: waveformData.samplesPerPixel,
      }
    : waveformData;

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

        {zoomedData && (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setZoomIdx(Math.min(zoomIdx + 1, ZOOM_LEVELS.length - 1))}
                disabled={zoomIdx >= ZOOM_LEVELS.length - 1}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setZoomIdx(Math.max(zoomIdx - 1, 0))}
                disabled={zoomIdx <= 0}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              {zoomIdx > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setZoomIdx(0)}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
              )}
              <span className="text-xs text-muted-foreground font-mono">{zoom}×</span>
            </div>
            <WaveformCanvas data={zoomedData as WaveformData} />
          </>
        )}

        <button onClick={() => useAudioStore.getState().clear()} className="text-xs text-muted-foreground hover:text-foreground underline">
          Analyze another file
        </button>
      </div>
    </ToolPage>
  );
};

export default WaveformViewer;
