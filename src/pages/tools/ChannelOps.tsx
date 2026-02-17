import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
const tool = getToolById('channel-ops')!;
const ChannelOps = () => (
  <ToolPage tool={tool}>
    <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={(f) => console.log(f.name)} label="Drop your audio file here" sublabel="WAV, FLAC, AIFF, MP3, OGG" />
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">Drop a file above for channel operations.</div>
  </ToolPage>
);
export default ChannelOps;
