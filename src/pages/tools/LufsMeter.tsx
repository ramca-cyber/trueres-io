import { useEffect, useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { MetricCard } from '@/components/display/MetricCard';
import { ComplianceBadge } from '@/components/display/ComplianceBadge';
import { LoudnessHistoryCanvas } from '@/components/visualizations/LoudnessHistoryCanvas';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { type LUFSResult } from '@/types/analysis';

const tool = getToolById('lufs-meter')!;

const LufsMeter = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress, decodeError } = useAudioFile();
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

  return (
    <ToolPage tool={tool}>
      {!fileName && (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={loadFile} label="Drop your audio file here" sublabel="WAV, FLAC, AIFF, MP3, OGG, AAC, M4A" />
      )}

      {fileName && (
        <div className="space-y-4">
          <FileInfoBar fileName={fileName} fileSize={fileSize} format={headerInfo?.format} duration={headerInfo?.duration} sampleRate={headerInfo?.sampleRate} bitDepth={headerInfo?.bitDepth} channels={headerInfo?.channels} />

          {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." />}
          {decodeError && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{decodeError}</div>}
          {analyzing && !lufs && <ProgressBar value={50} label="Measuring loudness..." />}

          {lufs && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MetricCard
                  label="Integrated LUFS"
                  value={isFinite(lufs.integrated) ? `${lufs.integrated.toFixed(1)}` : '—'}
                  subtext="Overall loudness"
                  status={lufs.integrated > -10 ? 'warn' : lufs.integrated < -20 ? 'info' : 'pass'}
                />
                <MetricCard
                  label="True Peak"
                  value={isFinite(lufs.truePeak) ? `${lufs.truePeak.toFixed(1)} dB` : '—'}
                  subtext="Maximum sample peak"
                  status={lufs.truePeak > -1 ? 'fail' : 'pass'}
                />
                <MetricCard
                  label="LRA"
                  value={`${lufs.lra.toFixed(1)} LU`}
                  subtext="Loudness Range"
                  status="info"
                />
                <MetricCard
                  label="Short-Term Max"
                  value={lufs.shortTerm.length > 0 ? `${Math.max(...lufs.shortTerm.filter(isFinite)).toFixed(1)}` : '—'}
                  subtext="LUFS (3s window)"
                  status="neutral"
                />
                <MetricCard
                  label="Momentary Max"
                  value={momentaryMax !== null && isFinite(momentaryMax) ? `${momentaryMax.toFixed(1)}` : '—'}
                  subtext="LUFS (400ms window)"
                  status="neutral"
                />
              </div>

              {lufs.shortTerm.length > 1 && (
                <LoudnessHistoryCanvas
                  shortTerm={lufs.shortTerm}
                  momentary={lufs.momentary}
                />
              )}

              <div>
                <h3 className="text-sm font-heading font-semibold mb-2">Platform Compliance</h3>
                <ComplianceBadge integratedLufs={lufs.integrated} truePeakDb={lufs.truePeak} />
              </div>
            </>
          )}

          <button onClick={() => useAudioStore.getState().clear()} className="text-xs text-muted-foreground hover:text-foreground underline">
            Analyze another file
          </button>
        </div>
      )}
    </ToolPage>
  );
};

export default LufsMeter;
