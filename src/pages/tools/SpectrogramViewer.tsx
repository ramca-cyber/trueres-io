import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ToolPage } from '@/components/shared/ToolPage';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { SpectrogramCanvas } from '@/components/visualizations/SpectrogramCanvas';
import { Slider } from '@/components/ui/slider';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT, FFT_SIZES, COLORMAPS, type Colormap } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { type SpectrogramData } from '@/types/analysis';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const tool = getToolById('spectrogram')!;

const SpectrogramViewer = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress, file } = useAudioFile();
  const { runAnalysis, getResult } = useAnalysis();
  const [colormap, setColormap] = useState<Colormap>('magma');
  const [minDb, setMinDb] = useState(-120);
  const [maxDb, setMaxDb] = useState(0);

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
        {file && <AudioPlayer src={file} label="Preview" />}

        {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." sublabel={`${decodeProgress}%`} />}

        {!spectrogramData && pcm && (
          <ProgressBar value={50} label="Computing spectrogram..." />
        )}

        {spectrogramData && (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
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

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Min dB</label>
                <Slider
                  value={[minDb]}
                  onValueChange={([v]) => setMinDb(v)}
                  min={-160}
                  max={-20}
                  step={5}
                  className="w-28"
                />
                <span className="text-xs font-mono text-muted-foreground w-10">{minDb}</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Max dB</label>
                <Slider
                  value={[maxDb]}
                  onValueChange={([v]) => setMaxDb(v)}
                  min={-40}
                  max={0}
                  step={5}
                  className="w-28"
                />
                <span className="text-xs font-mono text-muted-foreground w-10">{maxDb}</span>
              </div>
            </div>

            <SpectrogramCanvas
              data={spectrogramData as unknown as SpectrogramData}
              colormap={colormap}
              minDb={minDb}
              maxDb={maxDb}
            />
          </>
        )}

        <Button variant="outline" size="sm" onClick={() => useAudioStore.getState().clear()}>
          Analyze another file
        </Button>
      </div>
    </ToolPage>
  );
};

export default SpectrogramViewer;
