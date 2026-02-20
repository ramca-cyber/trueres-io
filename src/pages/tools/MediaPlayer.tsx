import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getToolById } from '@/config/tool-registry';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { PlaylistPanel, QueueItem } from '@/components/shared/PlaylistPanel';
import { MetadataDisplay } from '@/components/shared/MetadataDisplay';
import { LiveSpectrum } from '@/components/shared/LiveSpectrum';
import { LiveSpectrogram } from '@/components/shared/LiveSpectrogram';
import { WaveformSeekbar } from '@/components/shared/WaveformSeekbar';
import { ABLoopControls } from '@/components/shared/ABLoopControls';
import { ToolActionGrid } from '@/components/shared/ToolActionGrid';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ALL_MEDIA_ACCEPT, formatFileSize } from '@/config/constants';
import { formatTime } from '@/lib/utils';
import {
  AlertTriangle, RefreshCw,
  SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Music, Film, Minimize2, BarChart3,
  Timer, TimerOff, Download, Upload, AudioLines, VideoOff,
  Waves, Play, Pause, Volume2, VolumeX, Gauge, RotateCcw,
} from 'lucide-react';
import { processFile, getFFmpeg } from '@/engines/processing/ffmpeg-manager';
import { useMiniPlayerStore, type LoopMode } from '@/stores/mini-player-store';
import { usePlaybackContext } from '@/context/PlaybackContext';
import { cn } from '@/lib/utils';

const tool = getToolById('media-player')!;

const NATIVE_VIDEO = ['mp4', 'webm', 'mov'];
const NATIVE_AUDIO = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'aiff', 'aif', 'opus', 'weba'];
const NEEDS_TRANSCODE = ['mkv', 'avi', 'wma'];
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

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

async function extractAudio(
  file: File,
  onProgress: (p: number) => void,
): Promise<Blob> {
  const ext = getExt(file);
  const inputName = `input.${ext}`;
  return processFile(file, inputName, 'output.mp3', [
    '-i', inputName, '-vn', '-ab', '192k', 'output.mp3',
  ], onProgress);
}

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
const SLEEP_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '60m', value: 60 },
  { label: 'End of track', value: -1 },
];

function formatCountdown(seconds: number): string {
  return formatTime(seconds);
}

function generateM3U(queue: QueueItem[]): string {
  const lines = ['#EXTM3U'];
  for (const item of queue) {
    lines.push(`#EXTINF:-1,${item.file.name}`);
    lines.push(item.file.name);
  }
  return lines.join('\n');
}

export default function MediaPlayer() {
  // ── Shared playback engine via context ──
  const { audioRef, videoRef, analyserNode, audioNodes, onTrackEndRef } = usePlaybackContext();

  // ── Global playback state from store ──
  const store = useMiniPlayerStore();
  const queue = store.queue;
  const currentIndex = store.currentIndex;
  const isPlaying = store.isPlaying;
  const shuffleOn = store.shuffle;
  const shuffleOrder = store.shuffleOrder;
  const loopMode = store.loopMode;
  const crossfadeSec = store.crossfadeSec;
  const sleepMode = store.sleepMode;
  const audioOnlyMode = store.audioOnlyMode;
  const showSpectrum = store.showSpectrum;
  const showSpectrogram = store.showSpectrogram;

  const setQueue = store.setQueue;
  const setCurrentIndex = store.setCurrentIndex;
  const setShuffleOn = store.setShuffle;
  const setShuffleOrder = store.setShuffleOrder;
  const setLoopMode = store.setLoopMode;
  const setCrossfadeSec = store.setCrossfadeSec;
  const setSleepMode = store.setSleepMode;
  const setAudioOnlyMode = store.setAudioOnlyMode;
  const setShowSpectrum = store.setShowSpectrum;
  const setShowSpectrogram = store.setShowSpectrogram;

  // ── Local-only UI state ──
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [bass, setBass] = useState(0);
  const [mid, setMid] = useState(0);
  const [treble, setTreble] = useState(0);
  const [showEQ, setShowEQ] = useState(false);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  const [extractingAudio, setExtractingAudio] = useState(false);
  const [extractProgress, setExtractProgress] = useState(-1);

  // Pre-buffer next track for gapless
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const nextUrlRef = useRef<string>('');
  const crossfadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playlistInputRef = useRef<HTMLInputElement>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = queue[currentIndex] as QueueItem | undefined;
  const resetEQ = useCallback(() => { setBass(0); setMid(0); setTreble(0); }, []);
  const eqIsFlat = bass === 0 && mid === 0 && treble === 0;

  // ── Move video element into our container when playing video ──
  useEffect(() => {
    const video = videoRef.current;
    const container = videoContainerRef.current;
    if (!video || !container || !current?.isVideo || current.status !== 'ready') return;

    const originalParent = video.parentElement;
    container.appendChild(video);
    video.classList.remove('hidden');
    video.controls = true;

    return () => {
      video.controls = false;
      video.classList.add('hidden');
      if (originalParent) originalParent.appendChild(video);
    };
  }, [current?.isVideo, current?.id, current?.status, videoRef]);

  // ── Volume sync ──
  useEffect(() => {
    const v = muted ? 0 : volume;
    if (current?.isVideo) {
      if (videoRef.current) videoRef.current.volume = v;
    } else if (audioNodes) {
      audioNodes.gainNode.gain.value = v;
    }
  }, [volume, muted, current?.isVideo, audioNodes, videoRef]);

  // ── EQ sync ──
  useEffect(() => {
    if (!audioNodes) return;
    audioNodes.bassFilter.gain.value = bass;
    audioNodes.midFilter.gain.value = mid;
    audioNodes.trebleFilter.gain.value = treble;
  }, [bass, mid, treble, audioNodes]);

  // ── Speed sync ──
  useEffect(() => {
    const el = current?.isVideo ? videoRef.current : audioRef.current;
    if (el) el.playbackRate = speed;
  }, [speed, current?.isVideo, audioRef, videoRef]);

  // ── Mark store active when we have a queue ──
  useEffect(() => {
    if (queue.length > 0 && !store.active) {
      store.activate(queue, currentIndex);
    }
  }, [queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sleep timer logic ──
  useEffect(() => {
    if (sleepTimerRef.current) { clearInterval(sleepTimerRef.current); sleepTimerRef.current = null; }
    if (sleepMode === 0) { setSleepRemaining(0); return; }
    if (sleepMode === -1) { setSleepRemaining(-1); return; }

    const totalSec = sleepMode * 60;
    setSleepRemaining(totalSec);

    sleepTimerRef.current = setInterval(() => {
      setSleepRemaining(prev => {
        if (prev <= 1) {
          const el = audioRef.current || videoRef.current;
          if (el) el.pause();
          setSleepMode(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (sleepTimerRef.current) clearInterval(sleepTimerRef.current); };
  }, [sleepMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Transcode current track if needed ──
  useEffect(() => {
    if (!current || current.status !== 'pending') return;
    let cancelled = false;
    setQueue(queue.map((item, i) => i === currentIndex ? { ...item, status: 'transcoding' as const, progress: -1 } : item));
    transcodeFile(current.file, (p) => {
      if (cancelled) return;
      setQueue(store.queue.map((item, i) => i === currentIndex ? { ...item, progress: p } : item));
    }).then(result => {
      if (cancelled) return;
      setQueue(store.queue.map((item, i) => i === currentIndex ? { ...item, status: 'ready' as const, playbackSrc: result.blob, isVideo: result.isVideo, progress: 100 } : item));
    }).catch(() => {
      if (cancelled) return;
      setQueue(store.queue.map((item, i) => i === currentIndex ? { ...item, status: 'error' as const } : item));
    });
    return () => { cancelled = true; };
  }, [currentIndex, current?.id, current?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audio-only extraction for video ──
  const handleAudioOnly = useCallback(async () => {
    if (!current || !current.isVideo) return;
    setExtractingAudio(true);
    setExtractProgress(-1);
    try {
      const audioBlob = await extractAudio(current.file, setExtractProgress);
      setQueue(queue.map((item, i) => i === currentIndex ? {
        ...item, playbackSrc: audioBlob, isVideo: false,
      } : item));
      setAudioOnlyMode(true);
    } catch {
      // Silently fail
    } finally {
      setExtractingAudio(false);
    }
  }, [current, currentIndex, queue, setQueue, setAudioOnlyMode]);

  const handleRestoreVideo = useCallback(() => {
    if (!current) return;
    setQueue(queue.map((item, i) => i === currentIndex ? {
      ...item, playbackSrc: item.file, isVideo: isVideoFile(item.file),
    } : item));
    setAudioOnlyMode(false);
  }, [current, currentIndex, queue, setQueue, setAudioOnlyMode]);

  useEffect(() => {
    if (shuffleOn && queue.length > 0) setShuffleOrder(fisherYatesShuffle(queue.length));
  }, [shuffleOn, queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const queueIds = useMemo(() => queue.map(q => q.id).join(','), [queue]);

  // ── Pre-buffer next track for gapless ──
  useEffect(() => {
    const nextIdx = getNextIndex(currentIndex);
    if (nextIdx === null) return;
    const nextTrack = queue[nextIdx];
    if (!nextTrack || nextTrack.status !== 'ready' || !nextTrack.playbackSrc || nextTrack.isVideo) return;

    if (nextUrlRef.current) URL.revokeObjectURL(nextUrlRef.current);
    const u = URL.createObjectURL(nextTrack.playbackSrc);
    nextUrlRef.current = u;

    if (!nextAudioRef.current) nextAudioRef.current = new Audio();
    nextAudioRef.current.src = u;
    nextAudioRef.current.preload = 'auto';
    nextAudioRef.current.load();

    return () => {
      if (nextUrlRef.current) { URL.revokeObjectURL(nextUrlRef.current); nextUrlRef.current = ''; }
    };
  }, [currentIndex, queueIds, getNextIndex]);

  // ── Crossfade logic ──
  useEffect(() => {
    if (crossfadeSec <= 0) return;
    const el = audioRef.current;
    if (!el) return;

    let fading = false;
    const checkCrossfade = () => {
      if (fading || !el.duration || !isFinite(el.duration)) return;
      const remaining = el.duration - el.currentTime;
      if (remaining <= crossfadeSec && remaining > 0 && nextAudioRef.current?.src) {
        fading = true;
        const fadeInterval = 50;
        const steps = (crossfadeSec * 1000) / fadeInterval;
        let step = 0;
        const startVol = el.volume;
        const nextEl = nextAudioRef.current;
        nextEl.volume = 0;
        nextEl.play().catch(() => {});

        if (crossfadeTimerRef.current) clearInterval(crossfadeTimerRef.current);
        crossfadeTimerRef.current = setInterval(() => {
          step++;
          const t = step / steps;
          el.volume = Math.max(0, startVol * (1 - t));
          nextEl.volume = Math.min(1, t);
          if (step >= steps) {
            clearInterval(crossfadeTimerRef.current!);
            crossfadeTimerRef.current = null;
          }
        }, fadeInterval);
      }
    };

    el.addEventListener('timeupdate', checkCrossfade);
    return () => {
      el.removeEventListener('timeupdate', checkCrossfade);
      if (crossfadeTimerRef.current) clearInterval(crossfadeTimerRef.current);
    };
  }, [crossfadeSec, currentIndex, audioRef]);

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
    if (sleepMode === -1) { setSleepMode(0); return; }
    if (loopMode === 'one') {
      const el = audioRef.current || videoRef.current;
      if (el) { el.currentTime = 0; el.play(); }
      return;
    }
    const next = getNextIndex(currentIndex);
    if (next !== null) { setCurrentIndex(next); store.setPlaying(true); setAudioOnlyMode(false); }
  }, [loopMode, currentIndex, getNextIndex, sleepMode, audioRef, videoRef, setCurrentIndex, setAudioOnlyMode, setSleepMode, store]);

  // ── Register ended override so PlaybackEngine defers to us ──
  useEffect(() => {
    onTrackEndRef.current = handleEnded;
    return () => { onTrackEndRef.current = null; };
  }, [handleEnded, onTrackEndRef]);

  const togglePlayPause = useCallback(() => {
    const el = current?.isVideo ? videoRef.current : audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, [current?.isVideo, audioRef, videoRef]);

  const handleNext = useCallback(() => {
    const next = getNextIndex(currentIndex);
    if (next !== null) { setCurrentIndex(next); store.setPlaying(true); setAudioOnlyMode(false); }
  }, [currentIndex, getNextIndex, setCurrentIndex, setAudioOnlyMode, store]);

  const handlePrev = useCallback(() => {
    const el = audioRef.current || videoRef.current;
    if (el && el.currentTime > 3) { el.currentTime = 0; return; }
    const prev = getPrevIndex(currentIndex);
    if (prev !== null) { setCurrentIndex(prev); store.setPlaying(true); setAudioOnlyMode(false); }
  }, [currentIndex, getPrevIndex, audioRef, videoRef, setCurrentIndex, setAudioOnlyMode, store]);

  const handleFilesSelect = useCallback((files: File[]) => {
    const items = files.map(buildQueueItem);
    if (queue.length === 0) {
      setQueue(items);
      setCurrentIndex(0);
      store.activate(items, 0);
    } else {
      setQueue([...queue, ...items]);
    }
  }, [queue, setQueue, setCurrentIndex, store]);

  const handleSingleFile = useCallback((file: File) => handleFilesSelect([file]), [handleFilesSelect]);
  const handleSelect = useCallback((index: number) => { setCurrentIndex(index); store.setPlaying(true); setAudioOnlyMode(false); }, [setCurrentIndex, setAudioOnlyMode, store]);

  const handleRemove = useCallback((index: number) => {
    const n = [...queue]; n.splice(index, 1);
    setQueue(n);
    if (index < currentIndex) setCurrentIndex(currentIndex - 1);
    else if (index === currentIndex) { setCurrentIndex(Math.min(currentIndex, queue.length - 2)); store.setPlaying(true); }
  }, [currentIndex, queue, setQueue, setCurrentIndex, store]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    const n = [...queue]; const [m] = n.splice(fromIndex, 1); n.splice(toIndex, 0, m);
    setQueue(n);
    if (fromIndex === currentIndex) setCurrentIndex(toIndex);
    else if (fromIndex < currentIndex && toIndex >= currentIndex) setCurrentIndex(currentIndex - 1);
    else if (fromIndex > currentIndex && toIndex <= currentIndex) setCurrentIndex(currentIndex + 1);
  }, [currentIndex, queue, setQueue, setCurrentIndex]);

  const handleClear = useCallback(() => {
    store.deactivate();
  }, [store]);

  const handleAddFiles = useCallback(() => fileInputRef.current?.click(), []);
  const cycleLoop = useCallback(() => setLoopMode(loopMode === 'off' ? 'all' : loopMode === 'all' ? 'one' : 'off'), [loopMode, setLoopMode]);

  const handleMinimize = useCallback(() => {
    if (queue.length > 0) window.history.back();
  }, [queue.length]);

  const handleExportPlaylist = useCallback(() => {
    if (queue.length === 0) return;
    const content = generateM3U(queue);
    const blob = new Blob([content], { type: 'audio/mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'playlist.m3u';
    a.click();
    URL.revokeObjectURL(url);
  }, [queue]);

  const handleImportPlaylist = useCallback(() => {
    playlistInputRef.current?.click();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlayPause(); }
      else if (e.key === 'n' || e.key === 'N') handleNext();
      else if (e.key === 'p' || e.key === 'P') handlePrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNext, handlePrev, togglePlayPause]);

  const hasQueue = queue.length > 0;
  const trackNum = queue.length > 0 ? `${currentIndex + 1} / ${queue.length}` : '';
  const isAudioTrack = current && !current.isVideo;
  const isVideoTrack = current && current.isVideo;

  return (
    <ToolPage tool={tool}>
      <input ref={fileInputRef} type="file" accept={ALL_MEDIA_ACCEPT} multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) { handleFilesSelect(Array.from(e.target.files)); e.target.value = ''; } }} />
      <input ref={playlistInputRef} type="file" accept={ALL_MEDIA_ACCEPT} multiple className="hidden"
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

          {/* ── Audio extraction progress ── */}
          {extractingAudio && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-primary animate-spin shrink-0" />
                <div>
                  <p className="font-medium text-sm">Extracting audio…</p>
                  <p className="text-xs text-muted-foreground">{current?.file.name}</p>
                </div>
              </div>
              <ProgressBar value={extractProgress}
                label={extractProgress >= 0 ? `${extractProgress}%` : undefined}
                sublabel="Stripping video track" />
            </div>
          )}

          {/* ── Player area ── */}
          {!extractingAudio && current && current.status === 'transcoding' ? (
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
          ) : !extractingAudio && current && current.status === 'error' ? (
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
                  setQueue(queue.map((item, i) => i === currentIndex ? { ...item, status: 'pending' as const } : item));
                }}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry</Button>
                <Button variant="outline" size="sm" onClick={handleNext}>
                  <SkipForward className="h-3.5 w-3.5 mr-1.5" /> Skip</Button>
              </div>
            </div>
          ) : !extractingAudio && current && current.status === 'ready' && current.playbackSrc ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4">
                {current.isVideo ? (
                  /* Video container — the shared <video> element is moved here via DOM */
                  <div ref={videoContainerRef} className="w-full" />
                ) : (
                  /* Audio controls — volume, speed, EQ */
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Volume */}
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0"
                          onClick={() => setMuted(m => !m)}>
                          {muted || volume === 0
                            ? <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                            : <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                        <Slider min={0} max={1} step={0.01} value={[muted ? 0 : volume]}
                          onValueChange={([v]) => { setVolume(v); if (v > 0) setMuted(false); }}
                          className="flex-1" />
                        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                          {Math.round((muted ? 0 : volume) * 100)}%
                        </span>
                      </div>

                      {/* Speed */}
                      <div className="relative">
                        <Button variant="ghost" size="sm"
                          className={cn('h-7 px-2 text-xs font-mono gap-1', speed !== 1 && 'text-primary')}
                          onClick={() => setShowSpeed(s => !s)}>
                          <Gauge className="h-3 w-3" />{speed}x
                        </Button>
                        {showSpeed && (
                          <div className="absolute bottom-full left-0 mb-1 rounded-md border border-border bg-card p-1 shadow-lg z-10 flex gap-0.5">
                            {SPEEDS.map(s => (
                              <button key={s} onClick={() => { setSpeed(s); setShowSpeed(false); }}
                                className={cn('px-2 py-1 rounded text-xs font-mono transition-colors',
                                  s === speed ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground')}>
                                {s}x
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* EQ toggle */}
                      <Button variant="ghost" size="sm"
                        className={cn('h-7 px-2 text-xs', !eqIsFlat && 'text-primary')}
                        onClick={() => setShowEQ(s => !s)}>
                        EQ
                      </Button>
                    </div>

                    {/* EQ Panel */}
                    {showEQ && (
                      <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Equalizer</span>
                          <button onClick={resetEQ}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                            Reset
                          </button>
                        </div>
                        {[
                          { label: 'Bass', value: bass, set: setBass },
                          { label: 'Mid', value: mid, set: setMid },
                          { label: 'Treble', value: treble, set: setTreble },
                        ].map(band => (
                          <div key={band.label} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-12">{band.label}</span>
                            <Slider min={-12} max={12} step={1} value={[band.value]}
                              onValueChange={([v]) => band.set(v)} className="flex-1" />
                            <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">
                              {band.value > 0 ? '+' : ''}{band.value} dB
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Waveform seekbar for audio */}
              {isAudioTrack && (
                <div className="px-4 pb-2">
                  <WaveformSeekbar audioElement={audioRef.current} height={48} />
                </div>
              )}

              {isAudioTrack && showSpectrum && analyserNode && (
                <div className="px-4 pb-2">
                  <LiveSpectrum analyserNode={analyserNode} audioElement={audioRef.current} height={48} barCount={64} />
                </div>
              )}

              {isAudioTrack && showSpectrogram && analyserNode && (
                <div className="px-4 pb-4">
                  <LiveSpectrogram analyserNode={analyserNode} audioElement={audioRef.current} height={80} />
                </div>
              )}
            </div>
          ) : null}

          {/* ── Transport controls ── */}
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {queue.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setShuffleOn(!shuffleOn)}
                className={cn('h-8 w-8 p-0', shuffleOn && 'text-primary bg-primary/10')}
                aria-label={shuffleOn ? 'Shuffle on' : 'Shuffle off'}>
                <Shuffle className="h-4 w-4" />
              </Button>
            )}

            {queue.length > 1 && (
              <Button variant="ghost" size="sm" onClick={handlePrev} className="h-8 w-8 p-0" aria-label="Previous track">
                <SkipBack className="h-4 w-4" />
              </Button>
            )}

            {/* Play/Pause */}
            <Button variant="ghost" size="sm" onClick={togglePlayPause}
              className="h-9 w-9 p-0" aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            {queue.length > 1 && (
              <Button variant="ghost" size="sm" onClick={handleNext} className="h-8 w-8 p-0" aria-label="Next track">
                <SkipForward className="h-4 w-4" />
              </Button>
            )}

            {queue.length > 1 && (
              <Button variant="ghost" size="sm" onClick={cycleLoop}
                className={cn('h-8 px-2 gap-1.5 text-xs', loopMode !== 'off' && 'text-primary bg-primary/10')}
                aria-label={LOOP_LABELS[loopMode]}>
                {loopMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                <span className="font-mono text-[10px]">{loopMode === 'off' ? 'Off' : loopMode === 'one' ? '1' : 'All'}</span>
              </Button>
            )}

            {/* Spectrum toggle */}
            {isAudioTrack && current?.status === 'ready' && (
              <Button variant="ghost" size="sm" onClick={() => setShowSpectrum(!showSpectrum)}
                className={cn('h-8 w-8 p-0', showSpectrum && 'text-primary bg-primary/10')}
                aria-label="Toggle spectrum">
                <BarChart3 className="h-4 w-4" />
              </Button>
            )}

            {/* Spectrogram toggle */}
            {isAudioTrack && current?.status === 'ready' && (
              <Button variant="ghost" size="sm" onClick={() => setShowSpectrogram(!showSpectrogram)}
                className={cn('h-8 w-8 p-0', showSpectrogram && 'text-primary bg-primary/10')}
                aria-label="Toggle spectrogram">
                <Waves className="h-4 w-4" />
              </Button>
            )}

            {/* Crossfade */}
            {queue.length > 1 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm"
                    className={cn('h-8 px-2 gap-1 text-xs', crossfadeSec > 0 && 'text-primary bg-primary/10')}
                    aria-label={crossfadeSec > 0 ? `Crossfade: ${crossfadeSec}s` : 'Crossfade off'}>
                    <AudioLines className="h-3.5 w-3.5" />
                    <span className="font-mono text-[10px]">{crossfadeSec > 0 ? `${crossfadeSec}s` : 'X'}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-3" side="top">
                  <p className="text-xs text-muted-foreground mb-2">Crossfade duration</p>
                  <Slider min={0} max={5} step={1} value={[crossfadeSec]}
                    onValueChange={([v]) => setCrossfadeSec(v)} />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">Off</span>
                    <span className="text-[10px] text-muted-foreground">5s</span>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Sleep timer */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm"
                  className={cn('h-8 px-2 gap-1 text-xs', sleepMode !== 0 && 'text-primary bg-primary/10')}
                  aria-label={sleepMode === 0 ? 'Sleep timer' : sleepMode === -1 ? 'Stop after track' : `Sleep: ${formatCountdown(sleepRemaining)}`}>
                  {sleepMode !== 0 ? <TimerOff className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
                  {sleepMode > 0 && <span className="font-mono text-[10px]">{formatCountdown(sleepRemaining)}</span>}
                  {sleepMode === -1 && <span className="font-mono text-[10px]">EoT</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[140px] p-2" side="top">
                {SLEEP_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setSleepMode(opt.value)}
                    className={cn('w-full text-left px-3 py-1.5 rounded text-xs transition-colors',
                      sleepMode === opt.value ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground')}>
                    {opt.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Audio-only for video */}
            {isVideoTrack && current?.status === 'ready' && !extractingAudio && (
              <Button variant="ghost" size="sm" onClick={handleAudioOnly}
                className="h-8 px-2 gap-1 text-xs" aria-label="Audio-only mode">
                <VideoOff className="h-3.5 w-3.5" />
                <span className="text-[10px]">Audio only</span>
              </Button>
            )}

            {/* Restore video if in audio-only */}
            {audioOnlyMode && (
              <Button variant="ghost" size="sm" onClick={handleRestoreVideo}
                className="h-8 px-2 gap-1 text-xs text-primary" aria-label="Restore video">
                <Film className="h-3.5 w-3.5" />
                <span className="text-[10px]">Video</span>
              </Button>
            )}

            {/* Mini-player */}
            {current?.status === 'ready' && (
              <Button variant="ghost" size="sm" onClick={handleMinimize}
                className="h-8 w-8 p-0" aria-label="Minimize to mini-player">
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* A-B Loop */}
          {current?.status === 'ready' && (
            <div className="flex justify-center">
              <ABLoopControls audioElement={isAudioTrack ? audioRef.current : videoRef.current} />
            </div>
          )}

          {/* ── Playlist panel ── */}
          <PlaylistPanel queue={queue} currentIndex={currentIndex} onSelect={handleSelect}
            onRemove={handleRemove} onReorder={handleReorder} onAddFiles={handleAddFiles} onClear={handleClear} />

          {/* ── Playlist utilities ── */}
          {queue.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleExportPlaylist}>
                <Download className="h-3 w-3" /> Export .m3u
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleImportPlaylist}>
                <Upload className="h-3 w-3" /> Add files
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 ml-auto border-destructive/50 text-destructive hover:bg-destructive/10" onClick={handleClear}>
                <RotateCcw className="h-3 w-3" /> Start over
              </Button>
            </div>
          )}

          {/* ── Cross-tool actions ── */}
          {current && current.status === 'ready' && (
            <ToolActionGrid file={current.file} currentToolId="media-player" />
          )}

        </div>
      )}
    </ToolPage>
  );
}
