import { useState, useEffect, useRef, useCallback } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { BatchQueue } from '@/components/shared/BatchQueue';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT, formatFileSize } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { useBatchProcess } from '@/hooks/use-batch-process';
import { stripMetadataArgs, injectGainFilter } from '@/engines/processing/presets';
import { GainControl } from '@/components/shared/GainControl';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { cacheFile, getCachedFile, clearCachedFile, cacheBlob } from '@/lib/file-cache';
import { useToolSettingsStore } from '@/stores/tool-settings-store';

const TOOL_ID = 'metadata-stripper';
const tool = getToolById(TOOL_ID)!;

const MetadataStripper = () => {
  const [file, setFile] = useState<File | null>(null);
  const [gainDb, setGainDb] = useState(0);
  const addMoreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) { setFile(pending); cacheFile(`${TOOL_ID}-input`, pending); return; }
    getCachedFile(`${TOOL_ID}-input`).then(f => { if (f) setFile(f); });
    const saved = useToolSettingsStore.getState().getSettings(TOOL_ID);
    if (saved) {
      if (saved.gainDb !== undefined) setGainDb(saved.gainDb);
    }
  }, []);

  useEffect(() => {
    useToolSettingsStore.getState().setSettings(TOOL_ID, { gainDb });
  }, [gainDb]);

  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput, reset, preparing } = useFFmpeg();
  const batch = useBatchProcess();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); cacheFile(`${TOOL_ID}-input`, f); };
  const handleMultipleFiles = (files: File[]) => {
    if (files.length === 1) { handleFileSelect(files[0]); return; }
    setFile(null);
    batch.clearQueue();
    batch.addFiles(files);
  };

  const buildJob = useCallback((f: File) => {
    const ext = f.name.split('.').pop() || 'mp3';
    const baseName = f.name.replace(/\.[^.]+$/, '');
    const outName = `${baseName}_clean.${ext}`;
    const inputName = `input_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = injectGainFilter(stripMetadataArgs(inputName, outName), gainDb);
    return { inputName, outputName: outName, args };
  }, [gainDb]);

  const handleStrip = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'mp3';
    const outName = `stripped.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = injectGainFilter(stripMetadataArgs(inputName, outName), gainDb);
    const blob = await process(file, inputName, outName, args);
    if (blob) cacheBlob(`${TOOL_ID}-output`, blob, outName);
  };

  const handleClear = () => {
    setFile(null); clearOutput();
    clearCachedFile(`${TOOL_ID}-input`);
    clearCachedFile(`${TOOL_ID}-output`);
    useToolSettingsStore.getState().clearSettings(TOOL_ID);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'stripped';
  const ext = file?.name.split('.').pop() || 'mp3';
  const isBatchMode = batch.queue.length > 0;

  const infoPanel = (
    <div className="rounded-lg border border-border bg-card/50 p-4 flex items-start gap-3">
      <ShieldCheck className="h-5 w-5 text-status-pass shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium">Privacy Protection</p>
        <p className="text-xs text-muted-foreground mt-1">
          All metadata tags (title, artist, album, comments, cover art, encoder info) will be removed.
          The audio data itself remains untouched — no re-encoding.
        </p>
      </div>
    </div>
  );

  return (
    <ToolPage tool={tool}>
      {!file && !isBatchMode ? (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={handleFileSelect} multiple onMultipleFiles={handleMultipleFiles} label="Drop your audio files here" sublabel="Any supported audio format" />
      ) : isBatchMode ? (
        <div className="space-y-4">
          {infoPanel}
          <BatchQueue
            queue={batch.queue} isProcessing={batch.isProcessing} engineLoading={batch.engineLoading}
            engineError={batch.engineError} doneCount={batch.doneCount} allDone={batch.allDone}
            onRemoveFile={batch.removeFile} onRetryItem={(i) => batch.retryItem(i, buildJob)}
            onDownloadAll={batch.downloadAll} onAddMore={() => addMoreRef.current?.click()}
          />
          <input ref={addMoreRef} type="file" accept={AUDIO_ACCEPT} multiple className="hidden" onChange={(e) => { if (e.target.files) batch.addFiles(Array.from(e.target.files)); }} />
          <div className="flex gap-3">
            <Button onClick={() => batch.startProcessing(buildJob)} disabled={batch.isProcessing || batch.queue.length === 0}>
              {batch.isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {batch.isProcessing ? 'Stripping...' : `Strip ${batch.queue.length} files`}
            </Button>
            <Button variant="outline" onClick={() => batch.clearQueue()}>Clear all</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file!.name} fileSize={file!.size} />
          <AudioPlayer src={file!} label="Input" />
          {infoPanel}
          <GainControl file={file!} gainDb={gainDb} onGainChange={setGainDb} />
          {preparing && !loading && !processing && <ProgressBar value={-1} label="Preparing..." sublabel="Setting up processing" />}
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Stripping metadata..." sublabel={`${progress}%`} />}
          {(processError || loadError) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm text-destructive">{processError || loadError}</p>
              {loadError && <Button variant="outline" size="sm" onClick={() => { reset(); handleStrip(); }}>Retry</Button>}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleStrip} disabled={processing || loading || preparing}>
              {(processing || loading || preparing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {preparing ? 'Preparing...' : loading ? 'Loading engine...' : processing ? 'Stripping...' : 'Strip All Metadata'}
            </Button>
            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={handleClear}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                All metadata removed! {formatFileSize(outputBlob.size)}
                {file && outputBlob.size < file.size && ` (${Math.round((1 - outputBlob.size / file.size) * 100)}% smaller)`}
              </p>
              <AudioPlayer src={outputBlob} label="Output" />
              <DownloadButton blob={outputBlob} filename={`${baseName}_clean.${ext}`} label="Download clean file" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default MetadataStripper;
