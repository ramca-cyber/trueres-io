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
import { useAudioStore } from '@/stores/audio-store';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { type SpectrumData } from '@/types/analysis';
import { Button } from '@/components/ui/button';

const tool = getToolById('freq-response')!;

const FreqResponse = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress } = useAudioFile();

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) loadFile(pending);
  }, []);
  const { runAnalysis, getResult } = useAnalysis();

  const spectrumData = getResult<SpectrumData & { type: string; timestamp: number; duration: number }>('spectrum');

  useEffect(() => {
    if (pcm) runAnalysis('spectrum');
  }, [pcm, runAnalysis]);

  if (!fileName) {
    return (
      <ToolPage tool={tool}>
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={loadFile} label="Drop measurement file here" sublabel="Use a sweep recording to plot frequency response" />
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
        />
        {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." sublabel={`${decodeProgress}%`} />}
        {!spectrumData && pcm && <ProgressBar value={50} label="Computing frequency response..." />}
        {spectrumData && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Frequency Response Curve</h3>
            <p className="text-xs text-muted-foreground">
              For best results, use a logarithmic sweep recording captured through your audio chain.
            </p>
            <SpectrumCanvas data={spectrumData as unknown as SpectrumData} showOctaveBands={false} height={350} />
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => useAudioStore.getState().clear()}>
          Analyze another file
        </Button>
      </div>
    </ToolPage>
  );
};

export default FreqResponse;
