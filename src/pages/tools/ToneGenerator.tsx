import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
const tool = getToolById('tone-generator')!;
const ToneGenerator = () => (
  <ToolPage tool={tool}>
    <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground text-sm">
      Tone generator controls will appear here. Select frequency, waveform, and level to generate tones.
    </div>
  </ToolPage>
);
export default ToneGenerator;
