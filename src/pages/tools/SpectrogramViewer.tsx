import { useState, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { SpectrogramCanvas } from '@/components/visualizations/SpectrogramCanvas';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT, FFT_SIZES, COLORMAPS, type Colormap } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { type SpectrogramData } from '@/types/analysis';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const tool = getToolById('spectrogram')!;

const SpectrogramViewer = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress } = useAudioFile();
  const { runAnalysis, getResult } = useAnalysis();
  const [colormap, setColormap] = useState<Colormap>('magma');

  const spectrogramData = getResult<SpectrogramData & { type: string; timestamp: number; duration: number }>('spectrogram');

  useEffect(() => {
    if (pcm) {
      runAnalysis('spectrogram');
    }
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
          fileName={fileName}
          fileSize={fileSize}
          format={headerInfo?.format}
          duration={headerInfo?.duration}
          sampleRate={headerInfo?.sampleRate}
          bitDepth={headerInfo?.bitDepth}
          channels={headerInfo?.channels}
        />

        {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." sublabel={`${decodeProgress}%`} />}

        {!spectrogramData && pcm && (
          <ProgressBar value={50} label="Computing spectrogram..." />
        )}

        {spectrogramData && (
          <>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Colormap</label>
              <Select value={colormap} onValueChange={(v) => setColormap(v as Colormap)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLORMAPS.map((c) => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SpectrogramCanvas
              data={spectrogramData as unknown as SpectrogramData}
              colormap={colormap}
            />
          </>
        )}

        <button onClick={() => useAudioStore.getState().clear()} className="text-xs text-muted-foreground hover:text-foreground underline">
          Analyze another file
        </button>
      </div>
    </ToolPage>
  );
};

export default SpectrogramViewer;
