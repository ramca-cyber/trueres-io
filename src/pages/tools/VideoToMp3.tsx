import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { videoToMp3Args, MP3_BITRATES } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const tool = getToolById('video-to-mp3')!;

const VideoToMp3 = () => {
  const [file, setFile] = useState<File | null>(null);
  const [bitrate, setBitrate] = useState(320);
  const { process, processing, progress, outputBlob, loading, processError, clearOutput } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleExtract = async () => {
    if (!file) return;
    const outName = 'output.mp3';
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = videoToMp3Args(inputName, outName, bitrate);
    await process(file, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'audio';

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={VIDEO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your video file here" sublabel="MP4, WebM, AVI, MKV, MOV" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />
          <div className="space-y-2">
            <label className="text-sm font-medium">MP3 Bitrate</label>
            <Select value={bitrate.toString()} onValueChange={(v) => setBitrate(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MP3_BITRATES.map((b) => (
                  <SelectItem key={b} value={b.toString()}>{b} kbps</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {processing && <ProgressBar value={progress} label="Extracting audio..." sublabel={`${progress}%`} />}
          {processError && <p className="text-sm text-destructive">{processError}</p>}
          <div className="flex gap-3">
            <Button onClick={handleExtract} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Extracting...' : 'Extract MP3'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Audio extracted successfully!</p>
              <DownloadButton blob={outputBlob} filename={`${baseName}.mp3`} label="Download MP3" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default VideoToMp3;
