import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FILE_SIZE_WARN_BYTES, formatFileSize } from '@/config/constants';

interface DownloadButtonProps {
  blob: Blob;
  filename: string;
  label?: string;
}

export function DownloadButton({ blob, filename, label = 'Download' }: DownloadButtonProps) {
  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLarge = blob.size > FILE_SIZE_WARN_BYTES;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <Button onClick={handleDownload} className="gap-2">
        <Download className="h-4 w-4" />
        {label}
      </Button>
      {isLarge && (
        <p className="text-xs text-muted-foreground">
          Large file ({formatFileSize(blob.size)}) — download may take a moment
        </p>
      )}
    </div>
  );
}
