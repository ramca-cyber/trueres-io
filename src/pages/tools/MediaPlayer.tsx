import { useState, useEffect, useCallback } from 'react';
import { getToolById } from '@/config/tool-registry';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { ToolActionGrid } from '@/components/shared/ToolActionGrid';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Button } from '@/components/ui/button';
import { ALL_MEDIA_ACCEPT, formatFileSize } from '@/config/constants';
import { RotateCcw, Play, AlertTriangle, RefreshCw } from 'lucide-react';
import { processFile, getFFmpeg } from '@/engines/processing/ffmpeg-manager';

const tool = getToolById('media-player')!;

const NATIVE_VIDEO = ['mp4', 'webm', 'mov'];
const NATIVE_AUDIO = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'aiff', 'aif', 'opus', 'weba'];
const NEEDS_TRANSCODE = ['mkv', 'avi', 'wma'];

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
    const blob = await processFile(file, inputName, 'output.mp3', [
      '-i', inputName, '-ab', '192k', 'output.mp3',
    ], onProgress);
    return { blob, isVideo: false };
  }

  // MKV / AVI → MP4: try fast remux first
  try {
    const blob = await processFile(file, inputName, 'output.mp4', [
      '-i', inputName, '-c', 'copy', '-movflags', '+faststart', 'output.mp4',
    ], onProgress);
    return { blob, isVideo: true };
  } catch {
    // Remux failed — re-encode
    // Need to re-load engine since processFile cleaned up
    await getFFmpeg();
    const blob = await processFile(file, inputName, 'output.mp4', [
      '-i', inputName, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'output.mp4',
    ], onProgress);
    return { blob, isVideo: true };
  }
}

export default function MediaPlayer() {
  const [file, setFile] = useState<File | null>(null);
  const [playbackSrc, setPlaybackSrc] = useState<File | Blob | null>(null);
  const [playbackIsVideo, setPlaybackIsVideo] = useState(false);
  const [transcoding, setTranscoding] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [transError, setTransError] = useState<string | null>(null);

  const startTranscode = useCallback(async (f: File) => {
    setTranscoding(true);
    setProgress(-1);
    setTransError(null);
    setPlaybackSrc(null);
    try {
      const result = await transcodeFile(f, setProgress);
      setPlaybackSrc(result.blob);
      setPlaybackIsVideo(result.isVideo);
    } catch (e) {
      setTransError(e instanceof Error ? e.message : 'Transcoding failed');
    } finally {
      setTranscoding(false);
    }
  }, []);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setTransError(null);
    if (needsTranscode(f)) {
      startTranscode(f);
    } else {
      setPlaybackSrc(f);
      setPlaybackIsVideo(isVideoFile(f));
    }
  }, [startTranscode]);

  const handleReset = () => {
    setFile(null);
    setPlaybackSrc(null);
    setTranscoding(false);
    setProgress(-1);
    setTransError(null);
  };

  // Clean up blob URLs
  useEffect(() => {
    return () => {
      if (playbackSrc && playbackSrc !== file && playbackSrc instanceof Blob) {
        // Blob will be GC'd
      }
    };
  }, [playbackSrc, file]);

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <div className="space-y-3">
          <FileDropZone
            accept={ALL_MEDIA_ACCEPT}
            onFileSelect={handleFileSelect}
            label="Drop any audio or video file"
            sublabel="Supports MKV, AVI & WMA via automatic conversion"
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['WAV', 'FLAC', 'MP3', 'OGG', 'AAC', 'M4A', 'MP4', 'WebM', 'MKV', 'AVI', 'WMA', 'MOV'].map((fmt) => (
              <span key={fmt} className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                {fmt}
              </span>
            ))}
          </div>
        </div>
      ) : transcoding ? (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            <div>
              <p className="font-medium text-sm">Converting for playback…</p>
              <p className="text-xs text-muted-foreground">{file.name} · {formatFileSize(file.size)}</p>
            </div>
          </div>
          <ProgressBar
            value={progress}
            label={progress >= 0 ? `${progress}%` : undefined}
            sublabel="This may take a moment for large files"
          />
        </div>
      ) : transError ? (
        <div className="rounded-xl border border-destructive/50 bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-sm">Conversion failed</p>
              <p className="text-xs text-muted-foreground">{transError}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => startTranscode(file)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Choose different file
            </Button>
          </div>
        </div>
      ) : playbackSrc ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 bg-secondary/30">
              <Play className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium text-sm truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground ml-auto shrink-0">{formatFileSize(file.size)}</span>
            </div>
            <div className="p-4">
              {playbackIsVideo ? (
                <VideoPlayer src={playbackSrc} />
              ) : (
                <div className="py-4">
                  <AudioPlayer src={playbackSrc} />
                </div>
              )}
            </div>
          </div>
          <ToolActionGrid file={file} currentToolId="media-player" />
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Choose different file
          </Button>
        </div>
      ) : null}
    </ToolPage>
  );
}
