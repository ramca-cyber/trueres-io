import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { channelArgs, type ChannelOp } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const tool = getToolById('channel-ops')!;

const OPS: { value: ChannelOp; label: string; desc: string }[] = [
  { value: 'mono', label: 'Stereo → Mono', desc: 'Mix both channels to mono' },
  { value: 'left', label: 'Extract Left', desc: 'Extract left channel only' },
  { value: 'right', label: 'Extract Right', desc: 'Extract right channel only' },
  { value: 'swap', label: 'Swap L/R', desc: 'Swap left and right channels' },
];

const ChannelOps = () => {
  const [file, setFile] = useState<File | null>(null);
  const [op, setOp] = useState<ChannelOp>('mono');
  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput } = useFFmpeg();

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleProcess = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'wav';
    const outName = `channels.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = channelArgs(inputName, outName, op);
    await process(file, inputName, outName, args);
  };

  const baseName = file?.name.replace(/\.[^.]+$/, '') || 'output';
  const ext = file?.name.split('.').pop() || 'wav';

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your audio file here" sublabel="WAV, FLAC, AIFF, MP3, OGG" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />

          <div className="space-y-2">
            <label className="text-sm font-medium">Operation</label>
            <Select value={op} onValueChange={(v) => setOp(v as ChannelOp)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{OPS.find((o) => o.value === op)?.desc}</p>
          </div>

          {processing && <ProgressBar value={progress} label="Processing..." sublabel={`${progress}%`} />}
          {(processError || loadError) && <p className="text-sm text-destructive">{processError || loadError}</p>}

          <div className="flex gap-3">
            <Button onClick={handleProcess} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Processing...' : 'Process'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); }}>Choose different file</Button>
          </div>

          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Channel operation complete!</p>
              <DownloadButton blob={outputBlob} filename={`${baseName}_${op}.${ext}`} label="Download result" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default ChannelOps;
