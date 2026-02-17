import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMiniPlayerStore } from '@/stores/mini-player-store';
import { formatFileSize } from '@/config/constants';
import { Play, Pause, X, SkipForward, SkipBack, Maximize2, Music, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MiniPlayer() {
  const { active, queue, currentIndex, isPlaying, currentTime, duration, deactivate, setPlaying, setCurrentIndex, setTime } = useMiniPlayerStore();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState('');

  const current = queue[currentIndex];

  // Create object URL for current track
  useEffect(() => {
    if (!current?.playbackSrc) { setUrl(''); return; }
    const u = URL.createObjectURL(current.playbackSrc);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [current?.playbackSrc, current?.id]);

  // Sync play state
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !url) return;
    if (isPlaying) el.play().catch(() => {});
    else el.pause();
  }, [isPlaying, url]);

  // Time update
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setTime(el.currentTime, el.duration || 0);
    const onEnded = () => {
      const next = currentIndex + 1;
      if (next < queue.length) {
        setCurrentIndex(next);
        setPlaying(true);
      } else {
        setPlaying(false);
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [currentIndex, queue.length, setTime, setCurrentIndex, setPlaying]);

  if (!active || !current) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md shadow-lg">
      {/* Progress bar */}
      <div className="h-0.5 bg-secondary w-full">
        <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center gap-3 px-4 py-2 max-w-screen-xl mx-auto">
        {/* Track info */}
        <div className={cn(
          'flex items-center justify-center h-8 w-8 rounded-md shrink-0',
          current.isVideo ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary',
        )}>
          {current.isVideo ? <Film className="h-4 w-4" /> : <Music className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{current.file.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
            {queue.length > 1 && <> · {currentIndex + 1}/{queue.length}</>}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {queue.length > 1 && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
              onClick={() => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); }}>
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
            onClick={() => setPlaying(!isPlaying)}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          {queue.length > 1 && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
              onClick={() => { if (currentIndex < queue.length - 1) setCurrentIndex(currentIndex + 1); }}>
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
            onClick={() => navigate('/media-player')} title="Open full player">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>

          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={deactivate} title="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Hidden audio element */}
        {url && !current.isVideo && (
          <audio ref={audioRef} src={url} preload="auto" className="hidden" />
        )}
      </div>
    </div>
  );
}
