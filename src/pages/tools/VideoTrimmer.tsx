import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { trimArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const tool = getToolById('video-trimmer')!;

const VideoTrimmer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState('0');
  const [endTime, setEndTime] = useState('30');
  const { process, processing, progress, outputBlob, loading, processError, clearOutput } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleTrim = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'mp4';
    const outName = `trimmed.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = trimArgs(inputName, outName, parseFloat(startTime), parseFloat(endTime));
    await process(file, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'trimmed';
  const ext = file?.name.split('.').pop() || 'mp4';

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={VIDEO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your video file here" sublabel="MP4, WebM, AVI, MKV, MOV" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />
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
          {processing && <ProgressBar value={progress} label="Trimming video..." sublabel={`${progress}%`} />}
          {processError && <p className="text-sm text-destructive">{processError}</p>}
          <div className="flex gap-3">
            <Button onClick={handleTrim} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Trimming...' : 'Trim Video'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Video trimmed successfully!</p>
              <DownloadButton blob={outputBlob} filename={`${baseName}_trimmed.${ext}`} label="Download trimmed video" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default VideoTrimmer;
