import { useFFmpegStore } from '@/stores/ffmpeg-store';
import { AlertTriangle } from 'lucide-react';

export function ProcessingBanner() {
  const processing = useFFmpegStore((s) => s.processing);

  if (!processing) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-destructive/90 px-4 py-2 text-destructive-foreground text-sm font-medium backdrop-blur-sm">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>Conversion in progress — do not close or refresh the page, or you will lose your progress.</span>
    </div>
  );
}
