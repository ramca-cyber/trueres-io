import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ABLoopControlsProps {
  audioElement: HTMLAudioElement | HTMLVideoElement | null;
  className?: string;
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00.0';
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return `${m}:${sec.padStart(4, '0')}`;
}

/**
 * A-B loop: set point A and B, loop playback between them.
 */
export function ABLoopControls({ audioElement, className }: ABLoopControlsProps) {
  const [pointA, setPointA] = useState<number | null>(null);
  const [pointB, setPointB] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const rafRef = useRef<number>(0);

  // Enforce loop
  useEffect(() => {
    if (!audioElement || !active || pointA === null || pointB === null) return;

    const check = () => {
      if (audioElement.currentTime >= pointB) {
        audioElement.currentTime = pointA;
      }
      rafRef.current = requestAnimationFrame(check);
    };
    rafRef.current = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafRef.current);
  }, [audioElement, active, pointA, pointB]);

  const setA = useCallback(() => {
    if (!audioElement) return;
    const t = audioElement.currentTime;
    setPointA(t);
    if (pointB !== null && t >= pointB) setPointB(null);
  }, [audioElement, pointB]);

  const setB = useCallback(() => {
    if (!audioElement) return;
    const t = audioElement.currentTime;
    if (pointA !== null && t > pointA) {
      setPointB(t);
      setActive(true);
    }
  }, [audioElement, pointA]);

  const clear = useCallback(() => {
    setPointA(null);
    setPointB(null);
    setActive(false);
  }, []);

  const toggle = useCallback(() => {
    if (pointA !== null && pointB !== null) {
      setActive(a => !a);
    }
  }, [pointA, pointB]);

  const hasA = pointA !== null;
  const hasB = pointB !== null;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Button
        variant="ghost" size="sm"
        className={cn('h-7 px-2 text-xs font-mono', hasA && 'text-primary')}
        onClick={setA}
        title="Set loop start point (A)"
      >
        A{hasA ? ` ${formatTime(pointA!)}` : ''}
      </Button>

      <Button
        variant="ghost" size="sm"
        className={cn('h-7 px-2 text-xs font-mono', hasB && 'text-primary')}
        onClick={setB}
        disabled={!hasA}
        title="Set loop end point (B)"
      >
        B{hasB ? ` ${formatTime(pointB!)}` : ''}
      </Button>

      {hasA && hasB && (
        <Button
          variant="ghost" size="sm"
          className={cn('h-7 px-2 text-xs', active && 'text-primary bg-primary/10')}
          onClick={toggle}
          title={active ? 'Disable A-B loop' : 'Enable A-B loop'}
        >
          {active ? '⟳ On' : '⟳ Off'}
        </Button>
      )}

      {(hasA || hasB) && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground"
          onClick={clear} title="Clear A-B loop">
          ✕
        </Button>
      )}
    </div>
  );
}
