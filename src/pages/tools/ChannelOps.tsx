import { useState } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useFFmpeg } from '@/hooks/use-ffmpeg';
import { useAudioPreview, type ChannelMode } from '@/hooks/use-audio-preview';
import { channelArgs, type ChannelOp } from '@/engines/processing/presets';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Square } from 'lucide-react';

const tool = getToolById('channel-ops')!;

const OPS: { value: ChannelOp; label: string; desc: string; previewMode: ChannelMode }[] = [
  { value: 'mono', label: 'Stereo → Mono', desc: 'Mix both channels to mono', previewMode: 'mono' },
  { value: 'left', label: 'Extract Left', desc: 'Extract left channel only', previewMode: 'left' },
  { value: 'right', label: 'Extract Right', desc: 'Extract right channel only', previewMode: 'right' },
  { value: 'swap', label: 'Swap L/R', desc: 'Swap left and right channels', previewMode: 'swap' },
];

const ChannelOps = () => {
  const [file, setFile] = useState<File | null>(null);
  const [op, setOp] = useState<ChannelOp>('mono');
  const { process, processing, progress, outputBlob, loading, loadError, processError, clearOutput } = useFFmpeg();
  const { audioBuffer, isPlaying, decoding, playChannel, stop } = useAudioPreview(file);

  const handleFileSelect = (f: File) => { setFile(f); clearOutput(); };

  const handleProcess = async () => {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'wav';
    const outName = `channels.${ext}`;
    const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const args = channelArgs(inputName, outName, op);
    await process(file, inputName, outName, args);
  };

  const handlePreview = () => {
    if (isPlaying) { stop(); return; }
    const mode = OPS.find(o => o.value === op)?.previewMode ?? 'stereo';
    playChannel(mode);
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
          <AudioPlayer src={file} label="Input" />

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

          <div className="flex gap-3 flex-wrap">
            {audioBuffer && (
              <Button variant="secondary" onClick={handlePreview}>
                {isPlaying ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isPlaying ? 'Stop' : `Preview ${OPS.find(o => o.value === op)?.label}`}
              </Button>
            )}
            {decoding && <span className="text-xs text-muted-foreground flex items-center"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Decoding...</span>}
            <Button onClick={handleProcess} disabled={processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Processing...' : 'Process'}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); clearOutput(); stop(); }}>Choose different file</Button>
          </div>

          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Channel operation complete!</p>
              <AudioPlayer src={outputBlob} label="Output" />
              <DownloadButton blob={outputBlob} filename={`${baseName}_${op}.${ext}`} label="Download result" />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default ChannelOps;
