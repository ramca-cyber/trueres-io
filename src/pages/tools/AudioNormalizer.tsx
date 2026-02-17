import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { normalizeArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const tool = getToolById('audio-normalizer')!;

const TARGETS = [
  { value: '-14', label: '-14 LUFS (Spotify, YouTube)' },
  { value: '-16', label: '-16 LUFS (Apple Music, Podcast)' },
  { value: '-23', label: '-23 LUFS (EBU R128 Broadcast)' },
  { value: '-11', label: '-11 LUFS (Loud master)' },
];

const AudioNormalizer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [targetLUFS, setTargetLUFS] = useState('-14');
  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleNormalize = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'wav';
    const outName = `normalized.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = normalizeArgs(inputName, outName, parseFloat(targetLUFS));
    await process(file, inputName, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'normalized';
  const ext = file?.name.split('.').pop() || 'wav';

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your audio file here" sublabel="Any supported audio format" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />
          <AudioPlayer src={file} label="Input" />

          <div className="space-y-2">
            <label className="text-sm font-medium">Target Loudness</label>
            <Select value={targetLUFS} onValueChange={setTargetLUFS}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TARGETS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {processing && <ProgressBar value={progress} label="Normalizing..." sublabel={`${progress}%`} />}
          {(processError || loadError) && <p className="text-sm text-destructive">{processError || loadError}</p>}

          <div className="flex gap-3">
            <Button onClick={handleNormalize} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Normalizing...' : 'Normalize'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>

          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Normalization complete! Target: {targetLUFS} LUFS</p>
              <AudioPlayer src={outputBlob} label="Output" />
              <DownloadButton blob={outputBlob} filename={`${baseName}_normalized.${ext}`} label="Download normalized file" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default AudioNormalizer;
