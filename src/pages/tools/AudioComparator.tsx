import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
const tool = getToolById('audio-compare')!;
const AudioComparator = () => (
  <ToolPage tool={tool}>
    <div className="grid md:grid-cols-2 gap-4">
      <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={(f) => console.log('A:', f.name)} label="Drop File A" sublabel="First file to compare" />
      <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={(f) => console.log('B:', f.name)} label="Drop File B" sublabel="Second file to compare" />
    </div>
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">Drop two files above to compare.</div>
  </ToolPage>
);
export default AudioComparator;
