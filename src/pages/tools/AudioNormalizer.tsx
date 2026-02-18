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
import { useAudioPreview } from '@/hooks/use-audio-preview';
import { normalizeArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Square, Volume2 } from 'lucide-react';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { cacheFile, getCachedFile, clearCachedFile, cacheBlob } from '@/lib/file-cache';
import { useToolSettingsStore } from '@/stores/tool-settings-store';

const TOOL_ID = 'audio-normalizer';
const tool = getToolById(TOOL_ID)!;

const TARGETS = [
  { value: '-14', label: '-14 LUFS (Spotify, YouTube)', gain: 0 },
  { value: '-16', label: '-16 LUFS (Apple Music, Podcast)', gain: -2 },
  { value: '-23', label: '-23 LUFS (EBU R128 Broadcast)', gain: -9 },
  { value: '-11', label: '-11 LUFS (Loud master)', gain: 3 },
];

const AudioNormalizer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [targetLUFS, setTargetLUFS] = useState('-14');
  const [previewMode, setPreviewMode] = useState<'original' | 'normalized'>('original');
  const addMoreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) { setFile(pending); cacheFile(`${TOOL_ID}-input`, pending); return; }
    getCachedFile(`${TOOL_ID}-input`).then(f => { if (f) setFile(f); });
    const saved = useToolSettingsStore.getState().getSettings(TOOL_ID);
    if (saved) {
      if (saved.targetLUFS) setTargetLUFS(saved.targetLUFS);
    }
  }, []);

  useEffect(() => {
    useToolSettingsStore.getState().setSettings(TOOL_ID, { targetLUFS });
  }, [targetLUFS]);

  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput, reset } = useFFmpeg();
  const { audioBuffer, isPlaying, decoding, playWithGain, playRegion, stop, duration } = useAudioPreview(file);
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
    const outName = `${baseName}_normalized.${ext}`;
    const inputName = `input_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = normalizeArgs(inputName, outName, parseFloat(targetLUFS));
    return { inputName, outputName: outName, args };
  }, [targetLUFS]);

  const handleNormalize = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'wav';
    const outName = `normalized.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = normalizeArgs(inputName, outName, parseFloat(targetLUFS));
    const blob = await process(file, inputName, outName, args);
    if (blob) cacheBlob(`${TOOL_ID}-output`, blob, outName);
  };

  const handlePreview = (mode: 'original' | 'normalized') => {
    if (isPlaying && previewMode === mode) { stop(); return; }
    stop();
    setPreviewMode(mode);
    if (mode === 'original') { playRegion(0, duration); }
    else {
      const target = TARGETS.find(t => t.value === targetLUFS);
      playWithGain(target?.gain ?? 0);
    }
  };

  const handleClear = () => {
    setFile(null); clearOutput(); stop();
    clearCachedFile(`${TOOL_ID}-input`);
    clearCachedFile(`${TOOL_ID}-output`);
    useToolSettingsStore.getState().clearSettings(TOOL_ID);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'normalized';
  const ext = file?.name.split('.').pop() || 'wav';
  const isBatchMode = batch.queue.length > 0;

  const settingsPanel = (
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
  );

  return (
    <ToolPage tool={tool}>
      {!file && !isBatchMode ? (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={handleFileSelect} multiple onMultipleFiles={handleMultipleFiles} label="Drop your audio files here" sublabel="Any supported audio format" />
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
              {batch.isProcessing ? 'Normalizing...' : `Normalize ${batch.queue.length} files`}
            </Button>
            <Button variant="outline" onClick={() => batch.clearQueue()}>Clear all</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file!.name} fileSize={file!.size} />
          <AudioPlayer src={file!} label="Input" />
          {settingsPanel}
          {audioBuffer && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" size="sm" onClick={() => handlePreview('original')}>
                {isPlaying && previewMode === 'original' ? <Square className="h-3 w-3 mr-1.5" /> : <Play className="h-3 w-3 mr-1.5" />}
                Original
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handlePreview('normalized')}>
                {isPlaying && previewMode === 'normalized' ? <Square className="h-3 w-3 mr-1.5" /> : <Volume2 className="h-3 w-3 mr-1.5" />}
                Preview {targetLUFS} LUFS
              </Button>
              {decoding && <span className="text-xs text-muted-foreground flex items-center"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Decoding...</span>}
            </div>
          )}
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Normalizing..." sublabel={`${progress}%`} />}
          {(processError || loadError) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm text-destructive">{processError || loadError}</p>
              {loadError && <Button variant="outline" size="sm" onClick={() => { reset(); handleNormalize(); }}>Retry</Button>}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleNormalize} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Normalizing...' : 'Normalize'}
            </Button>
            <Button variant="outline" onClick={handleClear}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Normalization complete! Target: {targetLUFS} LUFS — {formatFileSize(outputBlob.size)}</p>
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
