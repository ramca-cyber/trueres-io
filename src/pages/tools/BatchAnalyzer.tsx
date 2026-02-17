import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
const tool = getToolById('batch-analyzer')!;
const BatchAnalyzer = () => (
  <ToolPage tool={tool}>
    <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={() => {}} multiple onMultipleFiles={(files) => console.log(files.length, 'files')} label="Drop album files here" sublabel="Drop multiple audio files" />
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">Drop files above for batch analysis.</div>
  </ToolPage>
);
export default BatchAnalyzer;
