import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
const tool = getToolById('dac-test')!;
const DacTest = () => (
  <ToolPage tool={tool}>
    <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground text-sm">
      DAC & headphone tests will appear here. Run channel check, frequency response, and dynamic range tests.
    </div>
  </ToolPage>
);
export default DacTest;
