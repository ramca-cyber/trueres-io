import { useState, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT, IMAGE_ACCEPT, formatFileSize } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { audioToVideoArgs, injectGainFilter } from '@/engines/processing/presets';
import { GainControl } from '@/components/shared/GainControl';
import { writeInputFile } from '@/engines/processing/ffmpeg-manager';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';
import { cacheFile, getCachedFile, clearCachedFile, cacheBlob } from '@/lib/file-cache';
import { useToolSettingsStore } from '@/stores/tool-settings-store';

const TOOL_ID = 'audio-to-video';
const tool = getToolById(TOOL_ID)!;

const RESOLUTION_PRESETS = [
  { label: '1080p (16:9)', width: 1920, height: 1080 },
  { label: '720p (16:9)', width: 1280, height: 720 },
  { label: 'Square (1:1)', width: 1080, height: 1080 },
  { label: 'Vertical (9:16)', width: 1080, height: 1920 },
] as const;

const QUALITY_PRESETS = [
  { value: '192', label: 'High (192 kbps)' },
  { value: '128', label: 'Medium (128 kbps)' },
  { value: '96', label: 'Low (96 kbps)' },
] as const;

const AudioToVideo = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [resolution, setResolution] = useState('1920x1080');
  const [audioQuality, setAudioQuality] = useState('192');
  const [gainDb, setGainDb] = useState(0);

  // Restore cached files + settings on mount
  useEffect(() => {
    getCachedFile(`${TOOL_ID}-audio`).then(f => { if (f) setAudioFile(f); });
    getCachedFile(`${TOOL_ID}-image`).then(f => {
      if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
    });
    const saved = useToolSettingsStore.getState().getSettings(TOOL_ID);
    if (saved) {
      if (saved.resolution) setResolution(saved.resolution);
      if (saved.audioQuality) setAudioQuality(saved.audioQuality);
      if (saved.gainDb !== undefined) setGainDb(saved.gainDb);
    }
  }, []);

  // Persist settings
  useEffect(() => {
    useToolSettingsStore.getState().setSettings(TOOL_ID, { resolution, audioQuality, gainDb });
  }, [resolution, audioQuality, gainDb]);

  const { process, processing, progress, outputBlob, loading, loadError, processError, cancelled, cancel, clearOutput, reset, preparing } = useFFmpeg();

  const handleAudioSelect = (f: File) => {
    setAudioFile(f);
    clearOutput();
    cacheFile(`${TOOL_ID}-audio`, f);
  };

  const handleImageSelect = (f: File) => {
    setImageFile(f);
    const url = URL.createObjectURL(f);
    setImagePreview(url);
    cacheFile(`${TOOL_ID}-image`, f);
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    clearCachedFile(`${TOOL_ID}-image`);
  };

  const handleGenerate = useCallback(async () => {
    if (!audioFile) return;

    const [w, h] = resolution.split('x').map(Number);
    const audioInputName = `input_audio.${audioFile.name.split('.').pop()}`;
    const imageInputName = imageFile ? `input_image.${imageFile.name.split('.').pop()}` : null;
    const outputName = 'output.mp4';

    if (imageFile && imageInputName) {
      await writeInputFile(imageInputName, imageFile);
    }

    const args = injectGainFilter(
      audioToVideoArgs(audioInputName, imageInputName, outputName, w, h, Number(audioQuality)),
      gainDb
    );
    const blob = await process(audioFile, audioInputName, outputName, args);
    if (blob) cacheBlob(`${TOOL_ID}-output`, blob, outputName);
  }, [audioFile, imageFile, resolution, audioQuality, gainDb, process]);

  const handleClear = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setAudioFile(null); setImageFile(null); setImagePreview(null); clearOutput();
    clearCachedFile(`${TOOL_ID}-audio`);
    clearCachedFile(`${TOOL_ID}-image`);
    clearCachedFile(`${TOOL_ID}-output`);
    useToolSettingsStore.getState().clearSettings(TOOL_ID);
  };

  const preset = RESOLUTION_PRESETS.find(p => `${p.width}x${p.height}` === resolution)!;
  const baseName = audioFile?.name.replace(/\.[^.]+$/, '') || 'video';

  return (
    <ToolPage tool={tool}>
      {!audioFile ? (
        <FileDropZone
          accept={AUDIO_ACCEPT}
          onFileSelect={handleAudioSelect}
          label="Drop your audio file here"
          sublabel="WAV, FLAC, MP3, OGG, AAC, and more"
        />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={audioFile.name} fileSize={audioFile.size} />
          <AudioPlayer src={audioFile} label="Input audio" />
          <GainControl file={audioFile} gainDb={gainDb} onGainChange={setGainDb} />

          {/* Background image (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Background Image (optional)</label>
            {imageFile ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                {imagePreview && (
                  <img src={imagePreview} alt="Background preview" className="h-16 w-16 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{imageFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(imageFile.size)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={clearImage}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <FileDropZone accept={IMAGE_ACCEPT} onFileSelect={handleImageSelect} label="Drop a background image" sublabel="PNG, JPG, JPEG, WebP — will be scaled/cropped to fit" />
            )}
            {!imageFile && (
              <p className="text-xs text-muted-foreground">No image? A solid black frame will be used.</p>
            )}
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution</label>
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESOLUTION_PRESETS.map((p) => (
                  <SelectItem key={`${p.width}x${p.height}`} value={`${p.width}x${p.height}`}>
                    {p.label} — {p.width}×{p.height}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Audio Quality */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Audio Quality</label>
            <Select value={audioQuality} onValueChange={setAudioQuality}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUALITY_PRESETS.map((q) => (
                  <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress / errors */}
          {preparing && !loading && !processing && <ProgressBar value={-1} label="Preparing files..." sublabel="Setting up conversion" />}
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Generating video..." sublabel={`${progress}%`} />}
          {cancelled && !processing && !processError && (
            <p className="text-sm text-muted-foreground">Conversion cancelled.</p>
          )}
          {(processError || loadError) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm text-destructive">{processError || loadError}</p>
              {loadError && <Button variant="outline" size="sm" onClick={() => { reset(); handleGenerate(); }}>Retry</Button>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {processing ? (
              <Button variant="destructive" onClick={cancel}>Cancel</Button>
            ) : (
              <Button onClick={handleGenerate} disabled={loading || preparing}>
                {(loading || preparing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {preparing ? 'Preparing...' : loading ? 'Loading engine...' : 'Generate Video'}
              </Button>
            )}
            <Button variant="outline" onClick={handleClear}>
              Choose different file
            </Button>
          </div>

          {/* Output */}
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Video generated! {formatFileSize(outputBlob.size)} — {preset.label}
              </p>
              <DownloadButton blob={outputBlob} filename={`${baseName}.mp4`} label="Download MP4" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};

export default AudioToVideo;
