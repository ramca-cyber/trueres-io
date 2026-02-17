import { useEffect, useState, forwardRef, useRef, useImperativeHandle, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: File | Blob;
  label?: string;
  className?: string;
  onEnded?: () => void;
  autoPlay?: boolean;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, label, className, onEnded, autoPlay }, ref) => {
    const [url, setUrl] = useState<string>('');
    const innerRef = useRef<HTMLVideoElement>(null);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [showSpeed, setShowSpeed] = useState(false);

    useImperativeHandle(ref, () => innerRef.current!, []);

    useEffect(() => {
      const objectUrl = URL.createObjectURL(src);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }, [src]);

    useEffect(() => {
      if (innerRef.current) {
        innerRef.current.volume = muted ? 0 : volume;
      }
    }, [volume, muted]);

    useEffect(() => {
      if (innerRef.current) innerRef.current.playbackRate = speed;
    }, [speed]);

    return (
      <div className={cn('space-y-3', className)}>
        {label && (
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
        )}
        <video
          ref={innerRef}
          controls
          preload="metadata"
          src={url}
          className="w-full max-h-[360px] rounded-md [color-scheme:dark]"
          onEnded={onEnded}
          autoPlay={autoPlay}
        />

        {/* Controls row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Volume */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0"
              onClick={() => setMuted(m => !m)}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[muted ? 0 : volume]}
              onValueChange={([v]) => { setVolume(v); if (v > 0) setMuted(false); }}
              className="flex-1"
            />
            <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
              {Math.round((muted ? 0 : volume) * 100)}%
            </span>
          </div>

          {/* Speed picker */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-7 px-2 text-xs font-mono gap-1', speed !== 1 && 'text-primary')}
              onClick={() => setShowSpeed(s => !s)}
            >
              <Gauge className="h-3 w-3" />
              {speed}x
            </Button>
            {showSpeed && (
              <div className="absolute bottom-full left-0 mb-1 rounded-md border border-border bg-card p-1 shadow-lg z-10 flex gap-0.5">
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setSpeed(s); setShowSpeed(false); }}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-mono transition-colors',
                      s === speed ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground',
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
