import { useState, useEffect, useCallback, useRef } from 'react';
import { getToolById } from '@/config/tool-registry';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { PlaylistPanel, QueueItem } from '@/components/shared/PlaylistPanel';
import { MetadataDisplay } from '@/components/shared/MetadataDisplay';
import { LiveSpectrum } from '@/components/shared/LiveSpectrum';
import { ToolActionGrid } from '@/components/shared/ToolActionGrid';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Button } from '@/components/ui/button';
import { ALL_MEDIA_ACCEPT, formatFileSize } from '@/config/constants';
import {
  RotateCcw, Play, AlertTriangle, RefreshCw,
  SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Music, Film, Minimize2, BarChart3,
} from 'lucide-react';
import { processFile, getFFmpeg } from '@/engines/processing/ffmpeg-manager';
import { useMiniPlayerStore } from '@/stores/mini-player-store';
import { cn } from '@/lib/utils';

const tool = getToolById('media-player')!;

const NATIVE_VIDEO = ['mp4', 'webm', 'mov'];
const NATIVE_AUDIO = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'aiff', 'aif', 'opus', 'weba'];
const NEEDS_TRANSCODE = ['mkv', 'avi', 'wma'];

let nextId = 0;
function makeId() { return `track-${++nextId}`; }

function getExt(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() || '';
}

function isVideoFile(file: File): boolean {
  const ext = getExt(file);
  if ([...NATIVE_VIDEO, 'mkv', 'avi'].includes(ext)) return true;
  if (file.type.startsWith('video/')) return true;
  return false;
}

function needsTranscode(file: File): boolean {
  return NEEDS_TRANSCODE.includes(getExt(file));
}

async function transcodeFile(
  file: File,
  onProgress: (p: number) => void,
): Promise<{ blob: Blob; isVideo: boolean }> {
  const ext = getExt(file);
  const inputName = `input.${ext}`;
  if (ext === 'wma') {
    const blob = await processFile(file, inputName, 'output.mp3', ['-i', inputName, '-ab', '192k', 'output.mp3'], onProgress);
    return { blob, isVideo: false };
  }
  try {
    const blob = await processFile(file, inputName, 'output.mp4', ['-i', inputName, '-c', 'copy', '-movflags', '+faststart', 'output.mp4'], onProgress);
    return { blob, isVideo: true };
  } catch {
    await getFFmpeg();
    const blob = await processFile(file, inputName, 'output.mp4', ['-i', inputName, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'output.mp4'], onProgress);
    return { blob, isVideo: true };
  }
}

type LoopMode = 'off' | 'one' | 'all';

function fisherYatesShuffle(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildQueueItem(file: File): QueueItem {
  const transcode = needsTranscode(file);
  return { id: makeId(), file, isVideo: isVideoFile(file), status: transcode ? 'pending' : 'ready', playbackSrc: transcode ? undefined : file };
}

const LOOP_LABELS: Record<LoopMode, string> = { off: 'Loop off', one: 'Repeat one', all: 'Repeat all' };

export default function MediaPlayer() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([]);
  const [loopMode, setLoopMode] = useState<LoopMode>('off');
  const [autoPlay, setAutoPlay] = useState(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [showSpectrum, setShowSpectrum] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const miniPlayer = useMiniPlayerStore();
  const current = queue[currentIndex] as QueueItem | undefined;

  // Transcode current track if needed
  useEffect(() => {
    if (!current || current.status !== 'pending') return;
    let cancelled = false;
    setQueue(q => q.map((item, i) => i === currentIndex ? { ...item, status: 'transcoding' as const, progress: -1 } : item));
    transcodeFile(current.file, (p) => {
      if (cancelled) return;
      setQueue(q => q.map((item, i) => i === currentIndex ? { ...item, progress: p } : item));
    }).then(result => {
      if (cancelled) return;
      setQueue(q => q.map((item, i) => i === currentIndex ? { ...item, status: 'ready' as const, playbackSrc: result.blob, isVideo: result.isVideo, progress: 100 } : item));
    }).catch(() => {
      if (cancelled) return;
      setQueue(q => q.map((item, i) => i === currentIndex ? { ...item, status: 'error' as const } : item));
    });
    return () => { cancelled = true; };
  }, [currentIndex, current?.id, current?.status]);

  useEffect(() => {
    if (shuffleOn && queue.length > 0) setShuffleOrder(fisherYatesShuffle(queue.length));
  }, [shuffleOn, queue.length]);

  const getNextIndex = useCallback((fromIndex: number): number | null => {
    if (queue.length <= 1 && loopMode !== 'one') return loopMode === 'all' ? 0 : null;
    if (shuffleOn && shuffleOrder.length === queue.length) {
      const pos = shuffleOrder.indexOf(fromIndex);
      const next = pos + 1;
      if (next >= shuffleOrder.length) return loopMode === 'all' ? shuffleOrder[0] : null;
      return shuffleOrder[next];
    }
    const next = fromIndex + 1;
    return next >= queue.length ? (loopMode === 'all' ? 0 : null) : next;
  }, [queue.length, shuffleOn, shuffleOrder, loopMode]);

  const getPrevIndex = useCallback((fromIndex: number): number | null => {
    if (shuffleOn && shuffleOrder.length === queue.length) {
      const pos = shuffleOrder.indexOf(fromIndex);
      const prev = pos - 1;
      if (prev < 0) return loopMode === 'all' ? shuffleOrder[shuffleOrder.length - 1] : null;
      return shuffleOrder[prev];
    }
    const prev = fromIndex - 1;
    return prev < 0 ? (loopMode === 'all' ? queue.length - 1 : null) : prev;
  }, [queue.length, shuffleOn, shuffleOrder, loopMode]);

  const handleEnded = useCallback(() => {
    if (loopMode === 'one') {
      const el = audioRef.current || videoRef.current;
      if (el) { el.currentTime = 0; el.play(); }
      return;
    }
    const next = getNextIndex(currentIndex);
    if (next !== null) { setCurrentIndex(next); setAutoPlay(true); }
  }, [loopMode, currentIndex, getNextIndex]);

  const handleNext = useCallback(() => {
    const next = getNextIndex(currentIndex);
    if (next !== null) { setCurrentIndex(next); setAutoPlay(true); }
  }, [currentIndex, getNextIndex]);

  const handlePrev = useCallback(() => {
    const el = audioRef.current || videoRef.current;
    if (el && el.currentTime > 3) { el.currentTime = 0; return; }
    const prev = getPrevIndex(currentIndex);
    if (prev !== null) { setCurrentIndex(prev); setAutoPlay(true); }
  }, [currentIndex, getPrevIndex]);

  const handleFilesSelect = useCallback((files: File[]) => {
    const items = files.map(buildQueueItem);
    if (queue.length === 0) { setQueue(items); setCurrentIndex(0); setAutoPlay(false); }
    else setQueue(q => [...q, ...items]);
  }, [queue.length]);

  const handleSingleFile = useCallback((file: File) => handleFilesSelect([file]), [handleFilesSelect]);
  const handleSelect = useCallback((index: number) => { setCurrentIndex(index); setAutoPlay(true); }, []);

  const handleRemove = useCallback((index: number) => {
    setQueue(q => { const n = [...q]; n.splice(index, 1); return n; });
    if (index < currentIndex) setCurrentIndex(i => i - 1);
    else if (index === currentIndex) { setCurrentIndex(i => Math.min(i, queue.length - 2)); setAutoPlay(true); }
  }, [currentIndex, queue.length]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setQueue(q => { const n = [...q]; const [m] = n.splice(fromIndex, 1); n.splice(toIndex, 0, m); return n; });
    if (fromIndex === currentIndex) setCurrentIndex(toIndex);
    else if (fromIndex < currentIndex && toIndex >= currentIndex) setCurrentIndex(i => i - 1);
    else if (fromIndex > currentIndex && toIndex <= currentIndex) setCurrentIndex(i => i + 1);
  }, [currentIndex]);

  const handleClear = useCallback(() => {
    setQueue([]); setCurrentIndex(0); setAutoPlay(false); setShuffleOn(false); setAnalyserNode(null);
  }, []);

  const handleAddFiles = useCallback(() => fileInputRef.current?.click(), []);
  const cycleLoop = useCallback(() => setLoopMode(m => m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'), []);

  const handleMinimize = useCallback(() => {
    if (queue.length > 0) {
      miniPlayer.activate(queue, currentIndex);
      miniPlayer.setPlaying(true);
    }
  }, [queue, currentIndex, miniPlayer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); const el = audioRef.current || videoRef.current; if (el) el.paused ? el.play() : el.pause(); }
      else if (e.key === 'n' || e.key === 'N') handleNext();
      else if (e.key === 'p' || e.key === 'P') handlePrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNext, handlePrev]);

  const hasQueue = queue.length > 0;
  const trackNum = queue.length > 0 ? `${currentIndex + 1} / ${queue.length}` : '';
  const isAudioTrack = current && !current.isVideo;

  return (
    <ToolPage tool={tool}>
      <input ref={fileInputRef} type="file" accept={ALL_MEDIA_ACCEPT} multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) { handleFilesSelect(Array.from(e.target.files)); e.target.value = ''; } }} />

      {!hasQueue ? (
        <div className="space-y-4">
          <FileDropZone accept={ALL_MEDIA_ACCEPT} onFileSelect={handleSingleFile} multiple onMultipleFiles={handleFilesSelect}
            label="Drop any audio or video files" sublabel="Multiple files supported · MKV, AVI & WMA auto-converted" />
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {['WAV', 'FLAC', 'MP3', 'OGG', 'AAC', 'M4A', 'MP4', 'WebM', 'MKV', 'AVI', 'WMA', 'MOV'].map((fmt) => (
              <span key={fmt} className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{fmt}</span>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-[10px]">Space</span> play/pause · <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-[10px]">N</span> next · <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-[10px]">P</span> prev
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Metadata + Now Playing ── */}
          {current && current.status === 'ready' && isAudioTrack && (
            <MetadataDisplay file={current.file} />
          )}

          {/* Fallback now-playing for video or when no metadata */}
          {current && (current.isVideo || current.status !== 'ready') && (
            <div className="flex items-center gap-3 px-1">
              <div className={cn('flex items-center justify-center h-8 w-8 rounded-lg shrink-0',
                current.isVideo ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary')}>
                {current.isVideo ? <Film className="h-4 w-4" /> : <Music className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{current.file.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatFileSize(current.file.size)}
                  {queue.length > 1 && <> · Track {trackNum}</>}
                </p>
              </div>
            </div>
          )}

          {/* ── Player area ── */}
          {current && current.status === 'transcoding' ? (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-primary animate-spin shrink-0" />
                <div>
                  <p className="font-medium text-sm">Converting for playback…</p>
                  <p className="text-xs text-muted-foreground">{current.file.name}</p>
                </div>
              </div>
              <ProgressBar value={current.progress ?? -1}
                label={current.progress != null && current.progress >= 0 ? `${current.progress}%` : undefined}
                sublabel="This may take a moment for large files" />
            </div>
          ) : current && current.status === 'error' ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="font-medium text-sm">Conversion failed</p>
                  <p className="text-xs text-muted-foreground">{current.file.name}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setQueue(q => q.map((item, i) => i === currentIndex ? { ...item, status: 'pending' as const } : item));
                }}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry</Button>
                <Button variant="outline" size="sm" onClick={handleNext}>
                  <SkipForward className="h-3.5 w-3.5 mr-1.5" /> Skip</Button>
              </div>
            </div>
          ) : current && current.status === 'ready' && current.playbackSrc ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4">
                {current.isVideo ? (
                  <VideoPlayer ref={videoRef} src={current.playbackSrc} onEnded={handleEnded} autoPlay={autoPlay} />
                ) : (
                  <AudioPlayer ref={audioRef} src={current.playbackSrc} onEnded={handleEnded} autoPlay={autoPlay}
                    onAnalyserReady={setAnalyserNode} />
                )}
              </div>

              {/* Live spectrum visualization */}
              {isAudioTrack && showSpectrum && analyserNode && (
                <div className="px-4 pb-4">
                  <LiveSpectrum analyserNode={analyserNode} height={48} barCount={64} />
                </div>
              )}
            </div>
          ) : null}

          {/* ── Transport controls ── */}
          <div className="flex items-center justify-center gap-1">
            {queue.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setShuffleOn(s => !s)}
                className={cn('h-8 w-8 p-0', shuffleOn && 'text-primary bg-primary/10')}
                title={shuffleOn ? 'Shuffle on' : 'Shuffle off'}>
                <Shuffle className="h-4 w-4" />
              </Button>
            )}

            {queue.length > 1 && (
              <Button variant="ghost" size="sm" onClick={handlePrev} className="h-8 w-8 p-0" title="Previous (P)">
                <SkipBack className="h-4 w-4" />
              </Button>
            )}

            {queue.length > 1 && (
              <Button variant="ghost" size="sm" onClick={handleNext} className="h-8 w-8 p-0" title="Next (N)">
                <SkipForward className="h-4 w-4" />
              </Button>
            )}

            {queue.length > 1 && (
              <Button variant="ghost" size="sm" onClick={cycleLoop}
                className={cn('h-8 px-2 gap-1.5 text-xs', loopMode !== 'off' && 'text-primary bg-primary/10')}
                title={LOOP_LABELS[loopMode]}>
                {loopMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                <span className="font-mono text-[10px]">{loopMode === 'off' ? 'Off' : loopMode === 'one' ? '1' : 'All'}</span>
              </Button>
            )}

            {/* Spectrum toggle (audio only) */}
            {isAudioTrack && current?.status === 'ready' && (
              <Button variant="ghost" size="sm" onClick={() => setShowSpectrum(s => !s)}
                className={cn('h-8 w-8 p-0', showSpectrum && 'text-primary bg-primary/10')}
                title="Toggle spectrum">
                <BarChart3 className="h-4 w-4" />
              </Button>
            )}

            {/* Mini-player (audio only, non-video) */}
            {isAudioTrack && current?.status === 'ready' && (
              <Button variant="ghost" size="sm" onClick={handleMinimize}
                className="h-8 w-8 p-0" title="Minimize to mini-player">
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* ── Playlist panel ── */}
          <PlaylistPanel queue={queue} currentIndex={currentIndex} onSelect={handleSelect}
            onRemove={handleRemove} onReorder={handleReorder} onAddFiles={handleAddFiles} onClear={handleClear} />

          {/* ── Cross-tool actions ── */}
          {current && current.status === 'ready' && (
            <ToolActionGrid file={current.file} currentToolId="media-player" />
          )}

          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleClear}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Start over
          </Button>
        </div>
      )}
    </ToolPage>
  );
}
