import { useState, useEffect, useRef, useCallback } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { BatchQueue } from '@/components/shared/BatchQueue';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT, formatFileSize } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { useBatchProcess } from '@/hooks/use-batch-process';
import { videoMuteArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Loader2, VolumeX } from 'lucide-react';
import { useFileTransferStore } from '@/stores/file-transfer-store';

const tool = getToolById('video-mute')!;

const VideoMute = () => {
  const [file, setFile] = useState<File | null>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) setFile(pending);
  }, []);

  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput, reset, preparing } = useFFmpeg();
  const batch = useBatchProcess();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };
  const handleMultipleFiles = (files: File[]) => {
    if (files.length === 1) { handleFileSelect(files[0]); return; }
    setFile(null);
    batch.clearQueue();
    batch.addFiles(files);
  };

  const buildJob = useCallback((f: File) => {
    const ext = f.name.split('.').pop() || 'mp4';
    const baseName = f.name.replace(/\.[^.]+$/, '');
    const outName = `${baseName}_muted.${ext}`;
    const inputName = `input_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = videoMuteArgs(inputName, outName);
    return { inputName, outputName: outName, args };
  }, []);

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
  const isBatchMode = batch.queue.length > 0;

  const infoPanel = (
    <div className="rounded-lg border border-border bg-card/50 p-4 flex items-start gap-3">
      <VolumeX className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium">Audio Removal</p>
        <p className="text-xs text-muted-foreground mt-1">
          The audio track will be completely removed. Video is copied without re-encoding (fast, no quality loss).
        </p>
      </div>
    </div>
  );

  return (
    <ToolPage tool={tool}>
      {!file && !isBatchMode ? (
        <FileDropZone accept={VIDEO_ACCEPT} onFileSelect={handleFileSelect} multiple onMultipleFiles={handleMultipleFiles} label="Drop your video files here" sublabel="MP4, WebM, AVI, MKV, MOV" />
      ) : isBatchMode ? (
        <div className="space-y-4">
          {infoPanel}
          <BatchQueue
            queue={batch.queue} isProcessing={batch.isProcessing} engineLoading={batch.engineLoading}
            engineError={batch.engineError} doneCount={batch.doneCount} allDone={batch.allDone}
            onRemoveFile={batch.removeFile} onRetryItem={(i) => batch.retryItem(i, buildJob)}
            onDownloadAll={batch.downloadAll} onAddMore={() => addMoreRef.current?.click()}
          />
          <input ref={addMoreRef} type="file" accept={VIDEO_ACCEPT} multiple className="hidden" onChange={(e) => { if (e.target.files) batch.addFiles(Array.from(e.target.files)); }} />
          <div className="flex gap-3">
            <Button onClick={() => batch.startProcessing(buildJob)} disabled={batch.isProcessing || batch.queue.length === 0}>
              {batch.isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {batch.isProcessing ? 'Processing...' : `Mute ${batch.queue.length} files`}
            </Button>
            <Button variant="outline" onClick={() => batch.clearQueue()}>Clear all</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file!.name} fileSize={file!.size} />
          <VideoPlayer src={file!} label="Input video" />
          {infoPanel}
          {preparing && !loading && !processing && <ProgressBar value={-1} label="Preparing..." sublabel="Setting up processing" />}
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Removing audio..." sublabel={`${progress}%`} />}
          {(processError || loadError) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm text-destructive">{processError || loadError}</p>
              {loadError && <Button variant="outline" size="sm" onClick={() => { reset(); handleMute(); }}>Retry</Button>}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleMute} disabled={processing || loading || preparing}>
              {(processing || loading || preparing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {preparing ? 'Preparing...' : loading ? 'Loading engine...' : processing ? 'Processing...' : 'Remove Audio'}
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
