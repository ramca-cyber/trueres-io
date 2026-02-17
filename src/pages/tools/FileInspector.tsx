import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { getToolById } from '@/config/tool-registry';
import { ALL_MEDIA_ACCEPT } from '@/config/constants';

const tool = getToolById('file-inspector')!;

const FileInspector = () => {
  return (
    <ToolPage tool={tool}>
      <FileDropZone accept={ALL_MEDIA_ACCEPT} onFileSelect={(f) => console.log(f.name)} label="Drop your audio file here" sublabel="Any audio format" />
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">Drop a file above to inspect its details.</div>
    </ToolPage>
  );
};

export default FileInspector;
