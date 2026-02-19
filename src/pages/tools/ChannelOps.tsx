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
import { useAudioPreview, type ChannelMode } from '@/hooks/use-audio-preview';
import { channelArgs, injectGainFilter, type ChannelOp } from '@/engines/processing/presets';
import { GainControl } from '@/components/shared/GainControl';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Square } from 'lucide-react';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { cacheFile, getCachedFile, clearCachedFile, cacheBlob } from '@/lib/file-cache';
import { useToolSettingsStore } from '@/stores/tool-settings-store';

const TOOL_ID = 'channel-ops';
const tool = getToolById(TOOL_ID)!;

const OPS: { value: ChannelOp; label: string; desc: string; previewMode: ChannelMode }[] = [
  { value: 'mono', label: 'Stereo → Mono', desc: 'Mix both channels to mono', previewMode: 'mono' },
  { value: 'left', label: 'Extract Left', desc: 'Extract left channel only', previewMode: 'left' },
  { value: 'right', label: 'Extract Right', desc: 'Extract right channel only', previewMode: 'right' },
  { value: 'swap', label: 'Swap L/R', desc: 'Swap left and right channels', previewMode: 'swap' },
];

const ChannelOps = () => {
  const [file, setFile] = useState<File | null>(null);
  const [op, setOp] = useState<ChannelOp>('mono');
  const [gainDb, setGainDb] = useState(0);
  const addMoreRef = useRef<HTMLInputElement>(null);

  // Restore cached file + settings on mount
  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) { setFile(pending); cacheFile(`${TOOL_ID}-input`, pending); return; }
    getCachedFile(`${TOOL_ID}-input`).then(f => { if (f) setFile(f); });
    const saved = useToolSettingsStore.getState().getSettings(TOOL_ID);
    if (saved) {
      if (saved.op) setOp(saved.op);
      if (saved.gainDb !== undefined) setGainDb(saved.gainDb);
    }
  }, []);

  // Persist settings
  useEffect(() => {
    useToolSettingsStore.getState().setSettings(TOOL_ID, { op, gainDb });
  }, [op, gainDb]);

  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput, reset, preparing } = useFFmpeg();
  const { audioBuffer, isPlaying, decoding, playChannel, stop } = useAudioPreview(file);
  const batch = useBatchProcess();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); cacheFile(`${TOOL_ID}-input`, f); };
  const handleMultipleFiles = (files: File[]) => {
    if (files.length === 1) { handleFileSelect(files[0]); return; }
    setFile(null);
    batch.clearQueue();
    batch.addFiles(files);
  };

  const buildJob = useCallback((f: File) => {
    const ext = f.name.split('.').pop() || 'wav';
    const baseName = f.name.replace(/\.[^.]+$/, '');
    const outName = `${baseName}_${op}.${ext}`;
    const inputName = `input_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = injectGainFilter(channelArgs(inputName, outName, op), gainDb);
    return { inputName, outputName: outName, args };
  }, [op, gainDb]);

  const handleProcess = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'wav';
    const outName = `channels.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = injectGainFilter(channelArgs(inputName, outName, op), gainDb);
    const blob = await process(file, inputName, outName, args);
    if (blob) cacheBlob(`${TOOL_ID}-output`, blob, outName);
  };

  const handlePreview = () => {
    if (isPlaying) { stop(); return; }
    const mode = OPS.find(o => o.value === op)?.previewMode ?? 'stereo';
    playChannel(mode);
  };

  const handleClear = () => {
    setFile(null); clearOutput(); stop();
    clearCachedFile(`${TOOL_ID}-input`);
    clearCachedFile(`${TOOL_ID}-output`);
    useToolSettingsStore.getState().clearSettings(TOOL_ID);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'output';
  const ext = file?.name.split('.').pop() || 'wav';
  const isBatchMode = batch.queue.length > 0;

  const settingsPanel = (
    <div className="space-y-2">
      <label className="text-sm font-medium">Operation</label>
      <Select value={op} onValueChange={(v) => setOp(v as ChannelOp)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {OPS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{OPS.find((o) => o.value === op)?.desc}</p>
    </div>
  );

  return (
    <ToolPage tool={tool}>
      {!file && !isBatchMode ? (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={handleFileSelect} multiple onMultipleFiles={handleMultipleFiles} label="Drop your audio files here" sublabel="WAV, FLAC, AIFF, MP3, OGG" />
      ) : isBatchMode ? (
        <div className="space-y-4">
          {settingsPanel}
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
              {batch.isProcessing ? 'Processing...' : `Process ${batch.queue.length} files`}
            </Button>
            <Button variant="outline" onClick={() => batch.clearQueue()}>Clear all</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file!.name} fileSize={file!.size} />
          <AudioPlayer src={file!} label="Input" />
          {settingsPanel}
          <GainControl file={file!} gainDb={gainDb} onGainChange={setGainDb} />
          {preparing && !loading && !processing && <ProgressBar value={-1} label="Preparing..." sublabel="Setting up processing" />}
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Processing..." sublabel={`${progress}%`} />}
          {(processError || loadError) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm text-destructive">{processError || loadError}</p>
              {loadError && <Button variant="outline" size="sm" onClick={() => { reset(); handleProcess(); }}>Retry</Button>}
            </div>
          )}
          <div className="flex gap-3 flex-wrap">
            {audioBuffer && (
              <Button variant="secondary" onClick={handlePreview}>
                {isPlaying ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isPlaying ? 'Stop' : `Preview ${OPS.find(o => o.value === op)?.label}`}
              </Button>
            )}
            {decoding && <span className="text-xs text-muted-foreground flex items-center"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Decoding...</span>}
            <Button onClick={handleProcess} disabled={processing || loading || preparing}>
              {(processing || loading || preparing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {preparing ? 'Preparing...' : loading ? 'Loading engine...' : processing ? 'Processing...' : 'Process'}
            </Button>
            <Button variant="outline" onClick={handleClear}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Channel operation complete! {formatFileSize(outputBlob.size)}</p>
              <AudioPlayer src={outputBlob} label="Output" />
              <DownloadButton blob={outputBlob} filename={`${baseName}_${op}.${ext}`} label="Download result" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default ChannelOps;
