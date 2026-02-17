import { useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { SpectrumCanvas } from '@/components/visualizations/SpectrumCanvas';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { type SpectrumData } from '@/types/analysis';

const tool = getToolById('spectrum-analyzer')!;

const SpectrumAnalyzer = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress } = useAudioFile();
  const { runAnalysis, getResult } = useAnalysis();

  const spectrumData = getResult<SpectrumData & { type: string; timestamp: number; duration: number }>('spectrum');

  useEffect(() => {
    if (pcm) runAnalysis('spectrum');
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
        {!spectrumData && pcm && <ProgressBar value={50} label="Computing spectrum..." />}
        {spectrumData && (
          <SpectrumCanvas data={spectrumData as unknown as SpectrumData} />
        )}
      </div>
    </ToolPage>
  );
};

export default SpectrumAnalyzer;
