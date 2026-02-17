import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { getToolById } from '@/config/tool-registry';
const tool = getToolById('sample-rate-converter')!;
const SampleRateConverter = () => (
  <ToolPage tool={tool}>
    <FileDropZone accept=".wav,.flac,.aiff" onFileSelect={(f) => console.log(f.name)} label="Drop your audio file here" sublabel="WAV, FLAC, AIFF" />
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">Drop a file above to resample.</div>
  </ToolPage>
);
export default SampleRateConverter;
