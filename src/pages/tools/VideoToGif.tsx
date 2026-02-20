import { useState, useEffect, useMemo } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT, formatFileSize } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { videoToGifArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { useFileTransferStore } from '@/stores/file-transfer-store';

const tool = getToolById('video-to-gif')!;

const VideoToGif = () => {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) setFile(pending);
  }, []);
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState('480');
  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput, reset, preparing } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleConvert = async () => {
    if (!file) return;
    const outName = 'output.gif';
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = videoToGifArgs(inputName, outName, fps, parseInt(width));
    await process(file, inputName, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'output';

  // GIF preview URL with proper cleanup
  const gifUrl = useMemo(() => {
    if (!outputBlob) return null;
    return URL.createObjectURL(outputBlob);
  }, [outputBlob]);

  useEffect(() => {
    return () => { if (gifUrl) URL.revokeObjectURL(gifUrl); };
  }, [gifUrl]);

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={VIDEO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your video file here" sublabel="MP4, WebM, AVI, MKV, MOV" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />
          <VideoPlayer src={file} label="Input video" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">FPS: {fps}</label>
              <Slider min={5} max={30} step={1} value={[fps]} onValueChange={([v]) => setFps(v)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Width (px)</label>
              <Input type="number" min="100" max="1920" step="10" value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
          </div>
          {preparing && !loading && !processing && <ProgressBar value={-1} label="Preparing..." sublabel="Setting up conversion" />}
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Creating GIF..." sublabel={`${progress}%`} />}
          {(processError || loadError) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm text-destructive">{processError || loadError}</p>
              {loadError && (
                <Button variant="outline" size="sm" onClick={() => { reset(); handleConvert(); }}>
                  Retry
                </Button>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleConvert} disabled={processing || loading || preparing}>
              {(processing || loading || preparing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {preparing ? 'Preparing...' : loading ? 'Loading engine...' : processing ? 'Creating GIF...' : 'Convert to GIF'}
            </Button>
            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                GIF created! {formatFileSize(outputBlob.size)}
                {file && ` (${Math.round((outputBlob.size / file.size) * 100)}% of original)`}
              </p>
              {gifUrl && (
                <img src={gifUrl} alt="Generated GIF preview" className="w-full max-h-[360px] object-contain rounded-md" />
              )}
              <DownloadButton blob={outputBlob} filename={`${baseName}.gif`} label="Download GIF" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default VideoToGif;
