import { useState, useEffect, useRef, useCallback } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { BatchQueue } from '@/components/shared/BatchQueue';
import { getToolById } from '@/config/tool-registry';
import { SAMPLE_RATES, formatFileSize } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { useBatchProcess } from '@/hooks/use-batch-process';
import { resampleArgs, injectGainFilter } from '@/engines/processing/presets';
import { GainControl } from '@/components/shared/GainControl';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { cacheFile, getCachedFile, clearCachedFile, cacheBlob } from '@/lib/file-cache';
import { useToolSettingsStore } from '@/stores/tool-settings-store';

const TOOL_ID = 'sample-rate-converter';
const tool = getToolById(TOOL_ID)!;

const SampleRateConverter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [targetRate, setTargetRate] = useState('48000');
  const [gainDb, setGainDb] = useState(0);
  const addMoreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) { setFile(pending); cacheFile(`${TOOL_ID}-input`, pending); return; }
    getCachedFile(`${TOOL_ID}-input`).then(f => { if (f) setFile(f); });
    const saved = useToolSettingsStore.getState().getSettings(TOOL_ID);
    if (saved) {
      if (saved.targetRate) setTargetRate(saved.targetRate);
      if (saved.gainDb !== undefined) setGainDb(saved.gainDb);
    }
  }, []);

  useEffect(() => {
    useToolSettingsStore.getState().setSettings(TOOL_ID, { targetRate, gainDb });
  }, [targetRate, gainDb]);

  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput, reset } = useFFmpeg();
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
    const outName = `${baseName}_${(parseInt(targetRate) / 1000).toFixed(1)}kHz.${ext}`;
    const inputName = `input_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = injectGainFilter(resampleArgs(inputName, outName, parseInt(targetRate)), gainDb);
    return { inputName, outputName: outName, args };
  }, [targetRate, gainDb]);

  const handleResample = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'wav';
    const outName = `resampled.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = injectGainFilter(resampleArgs(inputName, outName, parseInt(targetRate)), gainDb);
    const blob = await process(file, inputName, outName, args);
    if (blob) cacheBlob(`${TOOL_ID}-output`, blob, outName);
  };

  const handleClear = () => {
    setFile(null); clearOutput();
    clearCachedFile(`${TOOL_ID}-input`);
    clearCachedFile(`${TOOL_ID}-output`);
    useToolSettingsStore.getState().clearSettings(TOOL_ID);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'resampled';
  const ext = file?.name.split('.').pop() || 'wav';
  const isBatchMode = batch.queue.length > 0;

  const settingsPanel = (
    <div className="space-y-2">
      <label className="text-sm font-medium">Target Sample Rate</label>
      <Select value={targetRate} onValueChange={setTargetRate}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {SAMPLE_RATES.map((r) => (
            <SelectItem key={r} value={r.toString()}>{(r / 1000).toFixed(1)} kHz</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <ToolPage tool={tool}>
      {!file && !isBatchMode ? (
        <FileDropZone accept=".wav,.flac,.aiff" onFileSelect={handleFileSelect} multiple onMultipleFiles={handleMultipleFiles} label="Drop your audio files here" sublabel="WAV, FLAC, AIFF" />
      ) : isBatchMode ? (
        <div className="space-y-4">
          {settingsPanel}
          <BatchQueue
            queue={batch.queue} isProcessing={batch.isProcessing} engineLoading={batch.engineLoading}
            engineError={batch.engineError} doneCount={batch.doneCount} allDone={batch.allDone}
            onRemoveFile={batch.removeFile} onRetryItem={(i) => batch.retryItem(i, buildJob)}
            onDownloadAll={batch.downloadAll} onAddMore={() => addMoreRef.current?.click()}
          />
          <input ref={addMoreRef} type="file" accept=".wav,.flac,.aiff" multiple className="hidden" onChange={(e) => { if (e.target.files) batch.addFiles(Array.from(e.target.files)); }} />
          <div className="flex gap-3">
            <Button onClick={() => batch.startProcessing(buildJob)} disabled={batch.isProcessing || batch.queue.length === 0}>
              {batch.isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {batch.isProcessing ? 'Resampling...' : `Resample ${batch.queue.length} files`}
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
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Resampling..." sublabel={`${progress}%`} />}
          {(processError || loadError) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm text-destructive">{processError || loadError}</p>
              {loadError && <Button variant="outline" size="sm" onClick={() => { reset(); handleResample(); }}>Retry</Button>}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleResample} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Resampling...' : 'Resample'}
            </Button>
            <Button variant="outline" onClick={handleClear}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Resampled to {(parseInt(targetRate) / 1000).toFixed(1)} kHz — {formatFileSize(outputBlob.size)}</p>
              <AudioPlayer src={outputBlob} label="Output" />
              <DownloadButton blob={outputBlob} filename={`${baseName}_${(parseInt(targetRate) / 1000).toFixed(1)}kHz.${ext}`} label="Download resampled file" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default SampleRateConverter;
