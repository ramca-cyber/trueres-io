import { useState, useRef, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT, formatFileSize } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { trimArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Clock } from 'lucide-react';
import { useFileTransferStore } from '@/stores/file-transfer-store';

const tool = getToolById('video-trimmer')!;

const VideoTrimmer = () => {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) setFile(pending);
  }, []);
  const [startTime, setStartTime] = useState('0');
  const [endTime, setEndTime] = useState('30');
  const videoRef = useRef<HTMLVideoElement>(null);
  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput, reset } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleTrim = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'mp4';
    const outName = `trimmed.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = trimArgs(inputName, outName, parseFloat(startTime), parseFloat(endTime));
    await process(file, inputName, outName, args);
  };

  const setStartToCurrent = () => {
    if (videoRef.current) setStartTime(videoRef.current.currentTime.toFixed(1));
  };
  const setEndToCurrent = () => {
    if (videoRef.current) setEndTime(videoRef.current.currentTime.toFixed(1));
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
          <VideoPlayer ref={videoRef} src={file} label="Input video" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start (seconds)</label>
              <div className="flex gap-2">
                <Input type="number" min="0" step="0.1" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                <Button variant="outline" size="sm" onClick={setStartToCurrent} title="Set to current video time">
                  <Clock className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End (seconds)</label>
              <div className="flex gap-2">
                <Input type="number" min="0" step="0.1" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                <Button variant="outline" size="sm" onClick={setEndToCurrent} title="Set to current video time">
                  <Clock className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Trimming video..." sublabel={`${progress}%`} />}
          {(processError || loadError) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm text-destructive">{processError || loadError}</p>
              {loadError && (
                <Button variant="outline" size="sm" onClick={() => { reset(); handleTrim(); }}>
                  Retry
                </Button>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleTrim} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Trimming...' : 'Trim Video'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Video trimmed! {formatFileSize(outputBlob.size)}
                {file && outputBlob.size < file.size && ` (${Math.round((1 - outputBlob.size / file.size) * 100)}% smaller)`}
              </p>
              <VideoPlayer src={outputBlob} label="Output" />
              <DownloadButton blob={outputBlob} filename={`${baseName}_trimmed.${ext}`} label="Download trimmed video" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default VideoTrimmer;
