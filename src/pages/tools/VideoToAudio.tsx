import { useState, useEffect, useRef, useCallback } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { BatchQueue } from '@/components/shared/BatchQueue';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT, formatFileSize } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { useBatchProcess } from '@/hooks/use-batch-process';
import { videoToAudioArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useFileTransferStore } from '@/stores/file-transfer-store';

const tool = getToolById('video-to-audio')!;

const VideoToAudio = () => {
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
    const ext = f.name.split('.').pop()?.toLowerCase() || 'mp4';
    const audioExt = (ext === 'webm') ? 'ogg' : 'm4a';
    const baseName = f.name.replace(/\.[^.]+$/, '');
    const outName = `${baseName}.${audioExt}`;
    const inputName = `input_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = videoToAudioArgs(inputName, outName);
    return { inputName, outputName: outName, args };
  }, []);

  const handleExtract = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const audioExt = (ext === 'webm') ? 'ogg' : 'm4a';
    const outName = `audio.${audioExt}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = videoToAudioArgs(inputName, outName);
    await process(file, inputName, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'audio';
  const videoExt = file?.name.split('.').pop()?.toLowerCase() || 'mp4';
  const audioExt = (videoExt === 'webm') ? 'ogg' : 'm4a';
  const isBatchMode = batch.queue.length > 0;

  return (
    <ToolPage tool={tool}>
      {!file && !isBatchMode ? (
        <FileDropZone accept={VIDEO_ACCEPT} onFileSelect={handleFileSelect} multiple onMultipleFiles={handleMultipleFiles} label="Drop your video files here" sublabel="MP4, WebM, AVI, MKV, MOV" />
      ) : isBatchMode ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <p className="text-sm text-muted-foreground">
              Audio will be extracted in its original codec — no re-encoding, no quality loss.
            </p>
          </div>
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
              {batch.isProcessing ? 'Extracting...' : `Extract ${batch.queue.length} files`}
            </Button>
            <Button variant="outline" onClick={() => batch.clearQueue()}>Clear all</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file!.name} fileSize={file!.size} />
          <VideoPlayer src={file!} label="Input video" />
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <p className="text-sm text-muted-foreground">
              Audio will be extracted in its original codec — no re-encoding, no quality loss. This is the fastest and most faithful extraction method.
            </p>
          </div>
          {preparing && !loading && !processing && <ProgressBar value={-1} label="Preparing..." sublabel="Setting up extraction" />}
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Extracting audio..." sublabel={`${progress}%`} />}
          {(processError || loadError) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm text-destructive">{processError || loadError}</p>
              {loadError && <Button variant="outline" size="sm" onClick={() => { reset(); handleExtract(); }}>Retry</Button>}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleExtract} disabled={processing || loading || preparing}>
              {(processing || loading || preparing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {preparing ? 'Preparing...' : loading ? 'Loading engine...' : processing ? 'Extracting...' : 'Extract Audio'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Audio extracted (original codec) — {formatFileSize(outputBlob.size)}</p>
              <AudioPlayer src={outputBlob} label="Output" />
              <DownloadButton blob={outputBlob} filename={`${baseName}.${audioExt}`} label="Download audio" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default VideoToAudio;
