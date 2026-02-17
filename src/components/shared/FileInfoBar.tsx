import { File as FileIcon, Clock, HardDrive } from 'lucide-react';
import { formatFileSize, formatDuration, FORMAT_NAMES } from '@/config/constants';

interface FileInfoBarProps {
  fileName: string;
  fileSize: number;
  format?: string;
  duration?: number;
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
}

export function FileInfoBar({
  fileName,
  fileSize,
  format,
  duration,
  sampleRate,
  bitDepth,
  channels,
}: FileInfoBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <FileIcon className="h-4 w-4 text-primary shrink-0" />
        <span className="font-medium truncate">{fileName}</span>
      </div>

      <span className="text-muted-foreground">•</span>
      <span className="text-muted-foreground">{formatFileSize(fileSize)}</span>

      {format && (
        <>
          <span className="text-muted-foreground">•</span>
          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-secondary">
            {FORMAT_NAMES[format] || format.toUpperCase()}
          </span>
        </>
      )}

      {duration !== undefined && (
        <>
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(duration)}
          </span>
        </>
      )}

      {sampleRate && (
        <>
          <span className="text-muted-foreground hidden md:inline">•</span>
          <span className="hidden md:inline text-muted-foreground font-mono text-xs">
            {(sampleRate / 1000).toFixed(1)}kHz
          </span>
        </>
      )}

      {bitDepth && (
        <>
          <span className="text-muted-foreground hidden md:inline">•</span>
          <span className="hidden md:inline text-muted-foreground font-mono text-xs">{bitDepth}-bit</span>
        </>
      )}

      {channels && (
        <>
          <span className="text-muted-foreground hidden md:inline">•</span>
          <span className="hidden md:inline text-muted-foreground font-mono text-xs">
            {channels === 1 ? 'Mono' : channels === 2 ? 'Stereo' : `${channels}ch`}
          </span>
        </>
      )}
    </div>
  );
}
