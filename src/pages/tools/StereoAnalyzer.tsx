import { useEffect, useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { MetricCard } from '@/components/display/MetricCard';
import { CorrelationMeter } from '@/components/visualizations/CorrelationMeter';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { type StereoResult } from '@/types/analysis';

const tool = getToolById('stereo-analyzer')!;

const StereoAnalyzer = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress, decodeError } = useAudioFile();
  const { runAnalysis, getResult } = useAnalysis();
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!pcm) return;
    setAnalyzing(true);
    runAnalysis('stereo').then(() => setAnalyzing(false));
  }, [pcm, runAnalysis]);

  const stereo = getResult<StereoResult>('stereo');

  return (
    <ToolPage tool={tool}>
      {!fileName && (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={loadFile} label="Drop your audio file here" sublabel="WAV, FLAC, AIFF, MP3, OGG, AAC, M4A" />
      )}

      {fileName && (
        <div className="space-y-4">
          <FileInfoBar fileName={fileName} fileSize={fileSize} format={headerInfo?.format} duration={headerInfo?.duration} sampleRate={headerInfo?.sampleRate} channels={headerInfo?.channels} />

          {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." />}
          {decodeError && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{decodeError}</div>}
          {analyzing && !stereo && <ProgressBar value={50} label="Analyzing stereo field..." />}

          {stereo && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MetricCard
                  label="Correlation"
                  value={stereo.correlation.toFixed(3)}
                  subtext={stereo.correlation > 0.5 ? 'Good mono compat' : stereo.correlation > 0 ? 'Moderate' : 'Poor mono compat'}
                  status={stereo.correlation > 0.5 ? 'pass' : stereo.correlation > 0 ? 'warn' : 'fail'}
                />
                <MetricCard
                  label="Stereo Width"
                  value={`${(stereo.stereoWidth * 100).toFixed(0)}%`}
                  subtext={stereo.stereoWidth < 0.1 ? 'Near-mono' : stereo.stereoWidth > 0.5 ? 'Very wide' : 'Normal'}
                  status="info"
                />
                <MetricCard
                  label="Mid Energy"
                  value={`${(stereo.midEnergy * 100).toFixed(0)}%`}
                  subtext="Center channel energy"
                  status="neutral"
                />
                <MetricCard
                  label="Side Energy"
                  value={`${(stereo.sideEnergy * 100).toFixed(0)}%`}
                  subtext="Difference channel energy"
                  status="neutral"
                />
                <MetricCard
                  label="Mono Loss"
                  value={`${stereo.monoCompatibilityLoss.toFixed(1)}%`}
                  subtext="Energy lost in mono sum"
                  status={stereo.monoCompatibilityLoss > 10 ? 'warn' : 'pass'}
                />
              </div>

              <CorrelationMeter
                correlation={stereo.correlation}
                stereoWidth={stereo.stereoWidth}
                midEnergy={stereo.midEnergy}
                sideEnergy={stereo.sideEnergy}
              />
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

export default StereoAnalyzer;
