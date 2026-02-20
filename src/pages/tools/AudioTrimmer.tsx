import { useState, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { InteractiveWaveform } from '@/components/shared/InteractiveWaveform';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT, formatFileSize } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { useAudioPreview } from '@/hooks/use-audio-preview';
import { trimArgs, injectGainFilter } from '@/engines/processing/presets';
import { GainControl } from '@/components/shared/GainControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Play, Square } from 'lucide-react';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { cacheFile, getCachedFile, clearCachedFile, cacheBlob } from '@/lib/file-cache';
import { useToolSettingsStore } from '@/stores/tool-settings-store';

const TOOL_ID = 'audio-trimmer';
const tool = getToolById(TOOL_ID)!;

const AudioTrimmer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [gainDb, setGainDb] = useState(0);
  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput, reset, preparing } = useFFmpeg();
  const { audioBuffer, duration, isPlaying, currentTime, decoding, playRegion, stop, seekTo } = useAudioPreview(file);

  // Restore cached file + settings on mount
  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) { setFile(pending); cacheFile(`${TOOL_ID}-input`, pending); return; }
    getCachedFile(`${TOOL_ID}-input`).then(f => { if (f) setFile(f); });
    const saved = useToolSettingsStore.getState().getSettings(TOOL_ID);
    if (saved) {
      if (saved.gainDb !== undefined) setGainDb(saved.gainDb);
    }
  }, []);

  // Persist settings
  useEffect(() => {
    useToolSettingsStore.getState().setSettings(TOOL_ID, { gainDb });
  }, [gainDb]);

  // Auto-set end time to file duration when decoded
  useEffect(() => {
    if (duration > 0) {
      setEndTime(duration);
    }
  }, [duration]);

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); cacheFile(`${TOOL_ID}-input`, f); };

  const handleTrim = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'mp3';
    const outName = `trimmed.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = injectGainFilter(trimArgs(inputName, outName, startTime, endTime), gainDb);
    const blob = await process(file, inputName, outName, args);
    if (blob) cacheBlob(`${TOOL_ID}-output`, blob, outName);
  };

  const handlePreview = () => {
    if (isPlaying) { stop(); return; }
    playRegion(startTime, endTime);
  };

  const handleClear = () => {
    setFile(null); clearOutput(); stop();
    clearCachedFile(`${TOOL_ID}-input`);
    clearCachedFile(`${TOOL_ID}-output`);
    useToolSettingsStore.getState().clearSettings(TOOL_ID);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'trimmed';
  const ext = file?.name.split('.').pop() || 'mp3';

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your audio file here" sublabel="Any supported audio format" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />

          {decoding && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Decoding audio...
            </div>
          )}

          {audioBuffer && (
            <>
              <InteractiveWaveform
                audioBuffer={audioBuffer}
                startTime={startTime}
                endTime={endTime}
                onStartChange={setStartTime}
                onEndChange={setEndTime}
                currentTime={currentTime}
                onSeek={seekTo}
                onTogglePlay={handlePreview}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Start (seconds)</label>
                  <Input
                    type="number" min="0" max={endTime - 0.1} step="0.1"
                    value={startTime.toFixed(1)}
                    onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">End (seconds)</label>
                  <Input
                    type="number" min={startTime + 0.1} max={duration} step="0.1"
                    value={endTime.toFixed(1)}
                    onChange={(e) => setEndTime(Math.min(duration, parseFloat(e.target.value) || duration))}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Selection: {(endTime - startTime).toFixed(1)}s of {duration.toFixed(1)}s
              </p>

              <GainControl file={file} gainDb={gainDb} onGainChange={setGainDb} />
            </>
          )}

          {!audioBuffer && !decoding && <AudioPlayer src={file} label="Input" />}

          {preparing && !loading && !processing && <ProgressBar value={-1} label="Preparing..." sublabel="Setting up trim" />}
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Trimming..." sublabel={`${progress}%`} />}
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

          <div className="flex gap-3 flex-wrap">
            {audioBuffer && (
              <Button variant="secondary" onClick={handlePreview}>
                {isPlaying ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isPlaying ? 'Stop' : 'Preview Selection'}
              </Button>
            )}
            <Button onClick={handleTrim} disabled={processing || loading || preparing}>
              {(processing || loading || preparing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {preparing ? 'Preparing...' : loading ? 'Loading engine...' : processing ? 'Trimming...' : 'Trim'}
            </Button>
            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={handleClear}>Choose different file</Button>
          </div>

          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Trim complete! {formatFileSize(outputBlob.size)}
                {file && outputBlob.size < file.size && ` (${Math.round((1 - outputBlob.size / file.size) * 100)}% smaller)`}
              </p>
              <AudioPlayer src={outputBlob} label="Output" />
              <DownloadButton blob={outputBlob} filename={`${baseName}_trimmed.${ext}`} label="Download trimmed file" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default AudioTrimmer;
