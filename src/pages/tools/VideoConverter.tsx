import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { videoConvertArgs, VIDEO_OUTPUT_FORMATS } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const tool = getToolById('video-converter')!;

const VideoConverter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState('mp4');
  const { process, processing, progress, outputBlob, loading, processError, clearOutput } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleConvert = async () => {
    if (!file) return;
    const fmt = VIDEO_OUTPUT_FORMATS.find((f) => f.value === outputFormat);
    const outName = `output.${fmt?.ext || 'mp4'}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = videoConvertArgs(inputName, outName, outputFormat);
    await process(file, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'output';
  const fmt = VIDEO_OUTPUT_FORMATS.find((f) => f.value === outputFormat);

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={VIDEO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your video file here" sublabel="MP4, WebM, AVI, MKV, MOV" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Output Format</label>
            <Select value={outputFormat} onValueChange={(v) => { setOutputFormat(v); clearOutput(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VIDEO_OUTPUT_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {processing && <ProgressBar value={progress} label="Converting video..." sublabel={`${progress}%`} />}
          {processError && <p className="text-sm text-destructive">{processError}</p>}
          <div className="flex gap-3">
            <Button onClick={handleConvert} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Converting...' : 'Convert'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Conversion complete!</p>
              <DownloadButton blob={outputBlob} filename={`${baseName}.${fmt?.ext || 'mp4'}`} label={`Download ${fmt?.label || 'video'}`} />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default VideoConverter;
