import { useState, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { videoCompressArgs } from '@/engines/processing/presets';
import { formatFileSize } from '@/config/constants';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { useFileTransferStore } from '@/stores/file-transfer-store';

const tool = getToolById('video-compressor')!;

const VideoCompressor = () => {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) setFile(pending);
  }, []);
  const [crf, setCrf] = useState(28);
  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput, reset } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleCompress = async () => {
    if (!file) return;
    const outName = 'compressed.mp4';
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = videoCompressArgs(inputName, outName, crf);
    await process(file, inputName, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'compressed';
  const qualityLabel = crf <= 18 ? 'Very High' : crf <= 23 ? 'High' : crf <= 28 ? 'Medium' : crf <= 35 ? 'Low' : 'Very Low';

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={VIDEO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your video file here" sublabel="MP4, WebM, AVI, MKV, MOV" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />
          <VideoPlayer src={file} label="Input video" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Quality (CRF: {crf})</label>
              <span className="text-xs text-muted-foreground">{qualityLabel} quality — {crf <= 23 ? 'larger file' : 'smaller file'}</span>
            </div>
            <Slider min={18} max={40} step={1} value={[crf]} onValueChange={([v]) => setCrf(v)} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Higher quality</span>
              <span>Smaller file</span>
            </div>
          </div>
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Compressing..." sublabel={`${progress}%`} />}
          {(processError || loadError) && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm text-destructive">{processError || loadError}</p>
              {loadError && (
                <Button variant="outline" size="sm" onClick={() => { reset(); handleCompress(); }}>
                  Retry
                </Button>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleCompress} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Compressing...' : 'Compress Video'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Compressed! {formatFileSize(outputBlob.size)}
                {file && ` (${Math.round((1 - outputBlob.size / file.size) * 100)}% ${outputBlob.size < file.size ? 'smaller' : 'larger'})`}
              </p>
              <VideoPlayer src={outputBlob} label="Output" />
              <DownloadButton blob={outputBlob} filename={`${baseName}_compressed.mp4`} label="Download compressed video" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default VideoCompressor;
