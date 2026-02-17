import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { audioConvertArgs, AUDIO_OUTPUT_FORMATS, MP3_BITRATES } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const tool = getToolById('audio-converter')!;

const AudioConverter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState('mp3');
  const [bitrate, setBitrate] = useState(320);
  const { process, processing, progress, outputBlob, outputFileName, loading, loadError, processError, clearOutput, reset } = useFFmpeg();

  const handleFileSelect = (f: File) => {
    setFile(f);
    clearOutput();
  };

  const handleConvert = async () => {
    if (!file) return;
    const fmt = AUDIO_OUTPUT_FORMATS.find((f) => f.value === outputFormat);
    const outName = `output.${fmt?.ext || 'mp3'}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = audioConvertArgs(inputName, outName, outputFormat, bitrate);
    await process(file, inputName, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'output';
  const fmt = AUDIO_OUTPUT_FORMATS.find((f) => f.value === outputFormat);

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your audio file here" sublabel="Any supported audio format" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Output Format</label>
              <Select value={outputFormat} onValueChange={(v) => { setOutputFormat(v); clearOutput(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIO_OUTPUT_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(outputFormat === 'mp3' || outputFormat === 'aac') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Bitrate</label>
                <Select value={bitrate.toString()} onValueChange={(v) => setBitrate(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MP3_BITRATES.map((b) => (
                      <SelectItem key={b} value={b.toString()}>{b} kbps</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && <ProgressBar value={progress} label="Converting..." sublabel={`${progress}%`} />}
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
            <Button onClick={handleConvert} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Converting...' : 'Convert'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>
              Choose different file
            </Button>
          </div>

          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Conversion complete!</p>
              <DownloadButton blob={outputBlob} filename={`${baseName}.${fmt?.ext || 'mp3'}`} label={`Download ${fmt?.label || 'file'}`} />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default AudioConverter;
