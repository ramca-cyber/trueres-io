import { useAudioPreview } from '@/hooks/use-audio-preview';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2 } from 'lucide-react';

interface GainControlProps {
  file: File;
  gainDb: number;
  onGainChange: (db: number) => void;
}

export function GainControl({ file, gainDb, onGainChange }: GainControlProps) {
  const { audioBuffer, isPlaying, decoding, playWithGain, stop } = useAudioPreview(file);

  const handlePreview = () => {
    if (isPlaying) { stop(); return; }
    if (audioBuffer) playWithGain(gainDb);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Gain Adjustment</label>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-8 text-right shrink-0">-12</span>
        <Slider
          min={-12}
          max={12}
          step={0.5}
          value={[gainDb]}
          onValueChange={([v]) => onGainChange(v)}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-8 shrink-0">+12</span>
        <span className="text-sm font-mono w-16 text-right shrink-0">
          {gainDb > 0 ? '+' : ''}{gainDb.toFixed(1)} dB
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePreview}
          disabled={!audioBuffer && !decoding}
          className="shrink-0"
        >
          {decoding ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isPlaying ? (
            <><Square className="h-3 w-3 mr-1" /> Stop</>
          ) : (
            <><Play className="h-3 w-3 mr-1" /> Preview</>
          )}
        </Button>
      </div>
      {gainDb !== 0 && (
        <p className="text-xs text-muted-foreground">
          {gainDb > 0 ? 'Boosting' : 'Cutting'} volume by {Math.abs(gainDb).toFixed(1)} dB
        </p>
      )}
    </div>
  );
}
