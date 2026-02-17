import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
const tool = getToolById('tag-editor')!;
const TagEditor = () => (
  <ToolPage tool={tool}>
    <FileDropZone accept=".mp3,.flac,.ogg,.m4a" onFileSelect={(f) => console.log(f.name)} label="Drop your audio file here" sublabel="MP3, FLAC, OGG, M4A" />
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">Drop a file above to view and edit tags.</div>
  </ToolPage>
);
export default TagEditor;
