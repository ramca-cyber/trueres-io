import { useEffect, useState, forwardRef } from 'react';

interface AudioPlayerProps {
  src: File | Blob;
  label?: string;
  className?: string;
  onEnded?: () => void;
  autoPlay?: boolean;
}

export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  ({ src, label, className, onEnded, autoPlay }, ref) => {
    const [url, setUrl] = useState<string>('');

    useEffect(() => {
      const objectUrl = URL.createObjectURL(src);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }, [src]);

    return (
      <div className={className}>
        {label && (
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
        )}
        <audio
          ref={ref}
          controls
          preload="metadata"
          src={url}
          className="w-full [color-scheme:dark]"
          onEnded={onEnded}
          autoPlay={autoPlay}
        />
      </div>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer';
