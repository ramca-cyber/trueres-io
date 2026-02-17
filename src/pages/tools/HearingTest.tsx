import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
const tool = getToolById('hearing-test')!;
const HearingTest = () => (
  <ToolPage tool={tool}>
    <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground text-sm">
      Hearing test will appear here. Calibrate your volume and begin the audiometric test.
    </div>
  </ToolPage>
);
export default HearingTest;
