import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMiniPlayerStore } from '@/stores/mini-player-store';
import { formatTime } from '@/lib/utils';
import { Play, Pause, X, SkipForward, SkipBack, Maximize2, Music, Film, Volume2, VolumeX, Shuffle, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { register, unregister } from '@/lib/playback-manager';

export function MiniPlayer() {
  const store = useMiniPlayerStore();
  const { active, queue, currentIndex, isPlaying, currentTime, duration, deactivate, setPlaying, setCurrentIndex, setTime } = store;
  const shuffle = store.shuffle;
  const loop = store.loopMode;
  const navigate = useNavigate();
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState('');
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const current = queue[currentIndex];

  const getMediaEl = useCallback(() =>
    current?.isVideo ? videoRef.current : audioRef.current
  , [current?.isVideo]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) register(el);
    return () => { if (el) unregister(el); };
  }, []);

  useEffect(() => {
    if (!current?.playbackSrc) { setUrl(''); return; }
    const u = URL.createObjectURL(current.playbackSrc);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [current?.playbackSrc, current?.id]);

  useEffect(() => {
    const el = getMediaEl();
    if (!el || !url) return;

    const seekAndPlay = () => {
      const storeTime = useMiniPlayerStore.getState().currentTime;
      if (storeTime > 0 && Math.abs(el.currentTime - storeTime) > 0.5) {
        el.currentTime = storeTime;
      }
      if (isPlaying) el.play().catch(() => {});
    };

    if (el.readyState >= 2) {
      seekAndPlay();
    } else {
      el.addEventListener('loadeddata', seekAndPlay, { once: true });
      if (!isPlaying) el.pause();
      return () => el.removeEventListener('loadeddata', seekAndPlay);
    }
  }, [isPlaying, url, getMediaEl]);

  useEffect(() => {
    const el = getMediaEl();
    if (el) el.volume = muted ? 0 : volume;
  }, [volume, muted, getMediaEl]);

  useEffect(() => {
    const el = getMediaEl();
    if (!el) return;
    const onTime = () => {
      if (!seeking) setTime(el.currentTime, el.duration || 0);
    };
    const onEnded = () => {
      if (loop === 'one') { el.currentTime = 0; el.play().catch(() => {}); return; }
      let next: number;
      if (shuffle) {
        const remaining = Array.from({ length: queue.length }, (_, i) => i).filter(i => i !== currentIndex);
        next = remaining.length > 0 ? remaining[Math.floor(Math.random() * remaining.length)] : 0;
      } else {
        next = currentIndex + 1;
      }
      if (loop === 'all' && next >= queue.length) next = 0;
      if (next < queue.length) { setCurrentIndex(next); setPlaying(true); }
      else setPlaying(false);
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
  }, [currentIndex, queue.length, setTime, setCurrentIndex, setPlaying, seeking, shuffle, loop, getMediaEl]);

  const handleSeekChange = useCallback(([v]: number[]) => {
    setSeeking(true);
    setSeekValue(v);
  }, []);

  const handleSeekCommit = useCallback(([v]: number[]) => {
    const el = getMediaEl();
    if (el && duration > 0) {
      el.currentTime = (v / 100) * duration;
    }
    setSeeking(false);
  }, [duration, getMediaEl]);

  // Hide on the media player page (store stays active)
  if (location.pathname === '/media-player') return null;
  if (!active || !current) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayProgress = seeking ? seekValue : progress;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md shadow-lg">
      <div className="px-4 pt-1.5 max-w-screen-xl mx-auto">
        <Slider min={0} max={100} step={0.1} value={[displayProgress]}
          onValueChange={handleSeekChange} onValueCommit={handleSeekCommit} className="h-1" />
      </div>

      <div className="flex items-center gap-3 px-4 py-2 max-w-screen-xl mx-auto">
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

        <div className="hidden sm:flex items-center gap-1.5 min-w-[100px]">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setMuted(m => !m)}
            aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted || volume === 0 ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </Button>
          <Slider min={0} max={1} step={0.01} value={[muted ? 0 : volume]}
            onValueChange={([v]) => { setVolume(v); if (v > 0) setMuted(false); }}
            className="flex-1" />
        </div>

        <div className="flex items-center gap-0.5">
          {queue.length > 1 && (
            <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0', shuffle && 'text-primary')}
              onClick={() => store.setShuffle(!shuffle)} aria-label="Shuffle">
              <Shuffle className="h-3 w-3" />
            </Button>
          )}
          {queue.length > 1 && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
              onClick={() => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); }}
              aria-label="Previous track">
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
            onClick={() => setPlaying(!isPlaying)} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          {queue.length > 1 && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
              onClick={() => { if (currentIndex < queue.length - 1) setCurrentIndex(currentIndex + 1); }}
              aria-label="Next track">
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0', loop !== 'off' && 'text-primary')}
            onClick={() => store.setLoopMode(loop === 'off' ? 'all' : loop === 'all' ? 'one' : 'off')} aria-label="Loop">
            <Repeat className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
            onClick={() => navigate('/media-player')} aria-label="Open full player">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={deactivate} aria-label="Close mini player">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {url && !current.isVideo && (
          <audio ref={audioRef} src={url} preload="auto" className="hidden" />
        )}
        {url && current.isVideo && (
          <video ref={videoRef} src={url} preload="auto" className="hidden" />
        )}
      </div>
    </div>
  );
}
