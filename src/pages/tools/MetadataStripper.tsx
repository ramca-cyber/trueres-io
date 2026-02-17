import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { stripMetadataArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';

const tool = getToolById('metadata-stripper')!;

const MetadataStripper = () => {
  const [file, setFile] = useState<File | null>(null);
  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleStrip = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'mp3';
    const outName = `stripped.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = stripMetadataArgs(inputName, outName);
    await process(file, inputName, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'stripped';
  const ext = file?.name.split('.').pop() || 'mp3';

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your audio file here" sublabel="Any supported audio format" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />

          <div className="rounded-lg border border-border bg-card/50 p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-status-pass shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Privacy Protection</p>
              <p className="text-xs text-muted-foreground mt-1">
                All metadata tags (title, artist, album, comments, cover art, encoder info) will be removed. 
                The audio data itself remains untouched — no re-encoding.
              </p>
            </div>
          </div>

          {processing && <ProgressBar value={progress} label="Stripping metadata..." sublabel={`${progress}%`} />}
          {(processError || loadError) && <p className="text-sm text-destructive">{processError || loadError}</p>}

          <div className="flex gap-3">
            <Button onClick={handleStrip} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Stripping...' : 'Strip All Metadata'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>

          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">All metadata removed successfully!</p>
              <DownloadButton blob={outputBlob} filename={`${baseName}_clean.${ext}`} label="Download clean file" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default MetadataStripper;
