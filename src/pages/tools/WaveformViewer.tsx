import { useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { WaveformCanvas } from '@/components/visualizations/WaveformCanvas';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { type WaveformData } from '@/types/analysis';

const tool = getToolById('waveform-viewer')!;

const WaveformViewer = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress } = useAudioFile();
  const { runAnalysis, getResult } = useAnalysis();

  const waveformData = getResult<WaveformData & { type: string; timestamp: number; duration: number }>('waveform');

  useEffect(() => {
    if (pcm) runAnalysis('waveform');
  }, [pcm, runAnalysis]);

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
        {!waveformData && pcm && <ProgressBar value={50} label="Computing waveform..." />}
        {waveformData && (
          <WaveformCanvas data={waveformData as unknown as WaveformData} />
        )}
        <button onClick={() => useAudioStore.getState().clear()} className="text-xs text-muted-foreground hover:text-foreground underline">
          Analyze another file
        </button>
      </div>
    </ToolPage>
  );
};

export default WaveformViewer;
