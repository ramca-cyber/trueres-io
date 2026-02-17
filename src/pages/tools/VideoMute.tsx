import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT, formatFileSize } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { videoMuteArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Loader2, VolumeX } from 'lucide-react';

const tool = getToolById('video-mute')!;

const VideoMute = () => {
  const [file, setFile] = useState<File | null>(null);
  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput, reset } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleMute = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'mp4';
    const outName = `muted.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = videoMuteArgs(inputName, outName);
    await process(file, inputName, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'muted';
  const ext = file?.name.split('.').pop() || 'mp4';

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={VIDEO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your video file here" sublabel="MP4, WebM, AVI, MKV, MOV" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />
          <VideoPlayer src={file} label="Input video" />
          <div className="rounded-lg border border-border bg-card/50 p-4 flex items-start gap-3">
            <VolumeX className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Audio Removal</p>
              <p className="text-xs text-muted-foreground mt-1">
                The audio track will be completely removed. Video is copied without re-encoding (fast, no quality loss).
              </p>
            </div>
          </div>
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Removing audio..." sublabel={`${progress}%`} />}
          {(processError || loadError) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm text-destructive">{processError || loadError}</p>
              {loadError && (
                <Button variant="outline" size="sm" onClick={() => { reset(); handleMute(); }}>
                  Retry
                </Button>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleMute} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Processing...' : 'Remove Audio'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Audio removed! {formatFileSize(outputBlob.size)}
                {file && outputBlob.size < file.size && ` (${Math.round((1 - outputBlob.size / file.size) * 100)}% smaller)`}
              </p>
              <VideoPlayer src={outputBlob} label="Output (silent)" />
              <DownloadButton blob={outputBlob} filename={`${baseName}_muted.${ext}`} label="Download silent video" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default VideoMute;
