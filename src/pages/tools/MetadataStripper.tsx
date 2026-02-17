import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
const tool = getToolById('metadata-stripper')!;
const MetadataStripper = () => (
  <ToolPage tool={tool}>
    <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={(f) => console.log(f.name)} label="Drop your audio file here" sublabel="Any supported audio format" />
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">Drop a file above to strip metadata.</div>
  </ToolPage>
);
export default MetadataStripper;
