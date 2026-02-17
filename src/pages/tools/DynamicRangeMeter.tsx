import { useEffect, useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { MetricCard } from '@/components/display/MetricCard';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { type DynamicRangeResult } from '@/types/analysis';

const tool = getToolById('dynamic-range')!;

const DynamicRangeMeter = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress, decodeError } = useAudioFile();
  const { runAnalysis, getResult } = useAnalysis();
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!pcm) return;
    setAnalyzing(true);
    runAnalysis('dynamicRange').then(() => setAnalyzing(false));
  }, [pcm, runAnalysis]);

  const dr = getResult<DynamicRangeResult>('dynamicRange');

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
          {analyzing && !dr && <ProgressBar value={50} label="Measuring dynamic range..." />}

          {dr && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="DR Score"
                value={`DR${dr.drScore}`}
                subtext={dr.drScore >= 10 ? 'Excellent' : dr.drScore >= 6 ? 'Moderate' : 'Poor (loudness war)'}
                status={dr.drScore >= 10 ? 'pass' : dr.drScore >= 6 ? 'warn' : 'fail'}
              />
              <MetricCard
                label="Crest Factor"
                value={`${dr.crestFactor.toFixed(1)} dB`}
                subtext="Peak-to-RMS ratio"
                status="info"
              />
              <MetricCard
                label="Peak Level"
                value={`${dr.peakDbfs.toFixed(1)} dBFS`}
                subtext="Maximum sample peak"
                status={dr.peakDbfs > -0.3 ? 'warn' : 'pass'}
              />
              <MetricCard
                label="Clipping"
                value={dr.clippedSamples > 0 ? `${dr.clippedSamples}` : 'None'}
                subtext={dr.clippedSamples > 0 ? 'Clipped samples' : 'No clipping'}
                status={dr.clippedSamples > 0 ? 'fail' : 'pass'}
              />
            </div>
          )}

          <button onClick={() => useAudioStore.getState().clear()} className="text-xs text-muted-foreground hover:text-foreground underline">
            Analyze another file
          </button>
        </div>
      )}
    </ToolPage>
  );
};

export default DynamicRangeMeter;
