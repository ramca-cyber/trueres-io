import { useCallback, useState, useRef } from 'react';
import { Upload, File } from 'lucide-react';
import { formatFileSize } from '@/config/constants';

interface FileDropZoneProps {
  accept?: string;
  maxSizeMB?: number;
  onFileSelect: (file: File) => void;
  label?: string;
  sublabel?: string;
  multiple?: boolean;
  onMultipleFiles?: (files: File[]) => void;
}

export function FileDropZone({
  accept,
  maxSizeMB = 500,
  onFileSelect,
  label = 'Drop your file here',
  sublabel = 'or click to browse',
  multiple = false,
  onMultipleFiles,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);

      const maxBytes = maxSizeMB * 1024 * 1024;

      if (multiple && onMultipleFiles) {
        const validFiles: File[] = [];
        for (let i = 0; i < files.length; i++) {
          if (files[i].size > maxBytes) {
            setError(`${files[i].name} exceeds ${maxSizeMB}MB limit`);
            return;
          }
          validFiles.push(files[i]);
        }
        onMultipleFiles(validFiles);
        return;
      }

      const file = files[0];
      if (file.size > maxBytes) {
        setError(`File exceeds ${maxSizeMB}MB limit (${formatFileSize(file.size)})`);
        return;
      }
      onFileSelect(file);
    },
    [maxSizeMB, onFileSelect, multiple, onMultipleFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      validateAndSelect(e.dataTransfer.files);
    },
    [validateAndSelect]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all ${
        isDragging
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border hover:border-primary/50 hover:bg-secondary/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => validateAndSelect(e.target.files)}
      />

      <Upload className={`mx-auto h-10 w-10 mb-3 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
      <p className="font-heading font-semibold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground mt-1">{sublabel}</p>
      {accept && (
        <p className="text-xs text-muted-foreground mt-2">
          Supported: {accept.replace(/\./g, '').replace(/,/g, ', ').toUpperCase()}
        </p>
      )}
      {multiple && (
        <p className="text-xs text-primary/70 mt-1">Select multiple files for batch processing</p>
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive font-medium">{error}</p>
      )}
    </div>
  );
}
