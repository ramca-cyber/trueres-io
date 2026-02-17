import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { videoToGifArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';

const tool = getToolById('video-to-gif')!;

const VideoToGif = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState('480');
  const { process, processing, progress, outputBlob, loading, processError, clearOutput } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleConvert = async () => {
    if (!file) return;
    const outName = 'output.gif';
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = videoToGifArgs(inputName, outName, fps, parseInt(width));
    await process(file, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'output';

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={VIDEO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your video file here" sublabel="MP4, WebM, AVI, MKV, MOV" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />
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
          {processing && <ProgressBar value={progress} label="Creating GIF..." sublabel={`${progress}%`} />}
          {processError && <p className="text-sm text-destructive">{processError}</p>}
          <div className="flex gap-3">
            <Button onClick={handleConvert} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Creating GIF...' : 'Convert to GIF'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">GIF created! ({(outputBlob.size / 1024 / 1024).toFixed(1)} MB)</p>
              <DownloadButton blob={outputBlob} filename={`${baseName}.gif`} label="Download GIF" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default VideoToGif;
