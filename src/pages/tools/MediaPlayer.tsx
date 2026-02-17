import { useState } from 'react';
import { getToolById } from '@/config/tool-registry';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { ToolActionGrid } from '@/components/shared/ToolActionGrid';
import { Button } from '@/components/ui/button';
import { ALL_MEDIA_ACCEPT, formatFileSize } from '@/config/constants';
import { RotateCcw, Play } from 'lucide-react';

const tool = getToolById('media-player')!;

const VIDEO_EXTS = ['mp4', 'webm', 'avi', 'mkv', 'mov'];

function isVideoFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (VIDEO_EXTS.includes(ext)) return true;
  if (file.type.startsWith('video/')) return true;
  return false;
}

export default function MediaPlayer() {
  const [file, setFile] = useState<File | null>(null);

  const handleReset = () => setFile(null);

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <div className="space-y-3">
          <FileDropZone
            accept={ALL_MEDIA_ACCEPT}
            onFileSelect={setFile}
            label="Drop any audio or video file"
            sublabel="Play first, then analyze, convert, or edit — all from one place"
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['WAV', 'FLAC', 'MP3', 'OGG', 'AAC', 'M4A', 'MP4', 'WebM', 'AVI', 'MKV', 'MOV'].map((fmt) => (
              <span key={fmt} className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                {fmt}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Player hero area */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* File info header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 bg-secondary/30">
              <Play className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium text-sm truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground ml-auto shrink-0">{formatFileSize(file.size)}</span>
            </div>

            {/* Player */}
            <div className="p-4">
              {isVideoFile(file) ? (
                <VideoPlayer src={file} />
              ) : (
                <div className="py-4">
                  <AudioPlayer src={file} />
                </div>
              )}
            </div>
          </div>

          {/* Tool action grid */}
          <ToolActionGrid file={file} currentToolId="media-player" />

          {/* Reset */}
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Choose different file
          </Button>
        </div>
      )}
    </ToolPage>
  );
}
