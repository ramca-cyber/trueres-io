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
import { trimArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const tool = getToolById('audio-trimmer')!;

const AudioTrimmer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState('0');
  const [endTime, setEndTime] = useState('30');
  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleTrim = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'mp3';
    const outName = `trimmed.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = trimArgs(inputName, outName, parseFloat(startTime), parseFloat(endTime));
    await process(file, inputName, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'trimmed';
  const ext = file?.name.split('.').pop() || 'mp3';

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your audio file here" sublabel="Any supported audio format" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />
          <AudioPlayer src={file} label="Input" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start (seconds)</label>
              <Input type="number" min="0" step="0.1" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End (seconds)</label>
              <Input type="number" min="0" step="0.1" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {processing && <ProgressBar value={progress} label="Trimming..." sublabel={`${progress}%`} />}
          {(processError || loadError) && <p className="text-sm text-destructive">{processError || loadError}</p>}

          <div className="flex gap-3">
            <Button onClick={handleTrim} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Trimming...' : 'Trim'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>

          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Trim complete!</p>
              <AudioPlayer src={outputBlob} label="Output" />
              <DownloadButton blob={outputBlob} filename={`${baseName}_trimmed.${ext}`} label="Download trimmed file" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default AudioTrimmer;
