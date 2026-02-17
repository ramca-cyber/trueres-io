import { useEffect, useState } from 'react';

interface AudioPlayerProps {
  src: File | Blob;
  label?: string;
  className?: string;
}

export const AudioPlayer = ({ src, label, className }: AudioPlayerProps) => {
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
      <audio controls preload="metadata" src={url} className="w-full [color-scheme:dark]" />
    </div>
  );
};
