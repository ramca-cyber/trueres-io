import { useState, useEffect, useRef } from 'react';
import { Disc3, User, Music2 } from 'lucide-react';
import { parseId3 } from '@/engines/analysis/parsers/id3-parser';
import { parseFlacVorbisComments, parseOggVorbisComments } from '@/engines/analysis/parsers/vorbis-comment-parser';
import { type AudioMetadata } from '@/types/audio';
import { cn } from '@/lib/utils';

interface MetadataDisplayProps {
  file: File;
  className?: string;
  compact?: boolean;
}

function getExt(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() || '';
}

async function extractMetadata(file: File): Promise<AudioMetadata | null> {
  try {
    const buffer = await file.arrayBuffer();
    const ext = getExt(file);

    if (ext === 'mp3') return parseId3(buffer);
    if (ext === 'flac') {
      const u8 = new Uint8Array(buffer, 0, 4);
      if (u8[0] === 0x66 && u8[1] === 0x4C && u8[2] === 0x61 && u8[3] === 0x43) {
        return parseFlacVorbisComments(buffer);
      }
    }
    if (ext === 'ogg' || ext === 'opus') return parseOggVorbisComments(buffer);

    return null;
  } catch {
    return null;
  }
}

export function MetadataDisplay({ file, className, compact = false }: MetadataDisplayProps) {
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const coverUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Revoke previous cover URL
    if (coverUrlRef.current) {
      URL.revokeObjectURL(coverUrlRef.current);
      coverUrlRef.current = null;
      setCoverUrl(null);
    }
    setMetadata(null);

    extractMetadata(file).then(meta => {
      if (cancelled || !meta) return;
      setMetadata(meta);
      if (meta.coverArt) {
        const url = URL.createObjectURL(meta.coverArt);
        coverUrlRef.current = url;
        setCoverUrl(url);
      }
    });
    return () => {
      cancelled = true;
      if (coverUrlRef.current) {
        URL.revokeObjectURL(coverUrlRef.current);
        coverUrlRef.current = null;
      }
    };
  }, [file]);

  const hasInfo = metadata && (metadata.title || metadata.artist || metadata.album);

  if (!hasInfo && !coverUrl) return null;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 min-w-0', className)}>
        {coverUrl ? (
          <img src={coverUrl} alt="Cover art" className="h-10 w-10 rounded-md object-cover shrink-0" />
        ) : (
          <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center shrink-0">
            <Disc3 className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{metadata?.title || file.name}</p>
          {metadata?.artist && (
            <p className="text-xs text-muted-foreground truncate">{metadata.artist}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-start gap-4', className)}>
      {coverUrl ? (
        <img src={coverUrl} alt="Cover art" className="h-20 w-20 rounded-lg object-cover shrink-0 shadow-md" />
      ) : (
        <div className="h-20 w-20 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <Disc3 className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 space-y-1 py-1">
        <p className="font-medium truncate">{metadata?.title || file.name}</p>
        {metadata?.artist && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{metadata.artist}</span>
          </div>
        )}
        {metadata?.album && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Music2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{metadata.album}</span>
            {metadata.year && <span className="text-xs">({metadata.year})</span>}
          </div>
        )}
        {metadata?.genre && (
          <span className="inline-block rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
            {metadata.genre}
          </span>
        )}
      </div>
    </div>
  );
}
