import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { videoToAudioArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const tool = getToolById('video-to-audio')!;

const VideoToAudio = () => {
  const [file, setFile] = useState<File | null>(null);
  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

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

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={VIDEO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your video file here" sublabel="MP4, WebM, AVI, MKV, MOV" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <p className="text-sm text-muted-foreground">
              Audio will be extracted in its original codec — no re-encoding, no quality loss. This is the fastest and most faithful extraction method.
            </p>
          </div>
          {processing && <ProgressBar value={progress} label="Extracting audio..." sublabel={`${progress}%`} />}
          {(processError || loadError) && <p className="text-sm text-destructive">{processError || loadError}</p>}
          <div className="flex gap-3">
            <Button onClick={handleExtract} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Extracting...' : 'Extract Audio'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Audio extracted (original codec, no re-encoding)!</p>
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
