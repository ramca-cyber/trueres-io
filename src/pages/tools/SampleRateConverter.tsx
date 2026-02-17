import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { SAMPLE_RATES } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { resampleArgs } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const tool = getToolById('sample-rate-converter')!;

const SampleRateConverter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [targetRate, setTargetRate] = useState('48000');
  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleResample = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'wav';
    const outName = `resampled.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = resampleArgs(inputName, outName, parseInt(targetRate));
    await process(file, inputName, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'resampled';
  const ext = file?.name.split('.').pop() || 'wav';

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept=".wav,.flac,.aiff" onFileSelect={handleFileSelect} label="Drop your audio file here" sublabel="WAV, FLAC, AIFF" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />

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

          {processing && <ProgressBar value={progress} label="Resampling..." sublabel={`${progress}%`} />}
          {(processError || loadError) && <p className="text-sm text-destructive">{processError || loadError}</p>}

          <div className="flex gap-3">
            <Button onClick={handleResample} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Resampling...' : 'Resample'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>

          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Resampled to {(parseInt(targetRate) / 1000).toFixed(1)} kHz</p>
              <DownloadButton blob={outputBlob} filename={`${baseName}_${(parseInt(targetRate) / 1000).toFixed(1)}kHz.${ext}`} label="Download resampled file" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default SampleRateConverter;
