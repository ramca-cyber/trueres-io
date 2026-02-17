import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
const tool = getToolById('noise-generator')!;
const NoiseGenerator = () => (
  <ToolPage tool={tool}>
    <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground text-sm">
      Noise generator controls will appear here. Select noise type and level.
    </div>
  </ToolPage>
);
export default NoiseGenerator;
