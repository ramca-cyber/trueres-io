import { useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { MetricCard } from '@/components/display/MetricCard';
import { SpectrumCanvas } from '@/components/visualizations/SpectrumCanvas';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT, formatFrequency } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { type SpectrumData } from '@/types/analysis';

const tool = getToolById('spectrum-analyzer')!;

const SpectrumAnalyzer = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress } = useAudioFile();
  const { runAnalysis, getResult } = useAnalysis();

  const spectrumData = getResult<SpectrumData & { type: string; timestamp: number; duration: number }>('spectrum');

  useEffect(() => {
    if (pcm) runAnalysis('spectrum');
  }, [pcm, runAnalysis]);

  // Find peak frequency
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
        {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." sublabel={`${decodeProgress}%`} />}
        {!spectrumData && pcm && <ProgressBar value={50} label="Computing spectrum..." />}

        {spectrumData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard
                label="Peak Frequency"
                value={peakFreq !== null ? formatFrequency(peakFreq) : '—'}
                subtext="Dominant frequency"
                status="info"
              />
              <MetricCard
                label="Peak Magnitude"
                value={peakMag !== null ? `${peakMag.toFixed(1)} dB` : '—'}
                subtext="At peak frequency"
                status="neutral"
              />
              <MetricCard
                label="Nyquist"
                value={headerInfo?.sampleRate ? formatFrequency(headerInfo.sampleRate / 2) : '—'}
                subtext="Maximum representable freq"
                status="neutral"
              />
            </div>
            <SpectrumCanvas data={spectrumData as unknown as SpectrumData} />
          </>
        )}
        <button onClick={() => useAudioStore.getState().clear()} className="text-xs text-muted-foreground hover:text-foreground underline">
          Analyze another file
        </button>
      </div>
    </ToolPage>
  );
};

export default SpectrumAnalyzer;
