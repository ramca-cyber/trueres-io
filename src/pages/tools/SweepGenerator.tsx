import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
const tool = getToolById('sweep-generator')!;
const SweepGenerator = () => (
  <ToolPage tool={tool}>
    <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground text-sm">
      Sweep generator controls will appear here. Set start/end frequency, sweep type, and duration.
    </div>
  </ToolPage>
);
export default SweepGenerator;
