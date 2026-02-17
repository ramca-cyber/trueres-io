import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';

const tool = getToolById('lufs-meter')!;

const LufsMeter = () => {
  return (
    <ToolPage tool={tool}>
      <FileDropZone
        accept={AUDIO_ACCEPT}
        onFileSelect={(file) => console.log('File:', file.name)}
        label="Drop your audio file here"
        sublabel="WAV, FLAC, AIFF, MP3, OGG, AAC, M4A"
      />
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">
        Drop a file above to measure loudness.
      </div>
    </ToolPage>
  );
};

export default LufsMeter;
