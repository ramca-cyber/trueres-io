import { useCallback, useState, useRef } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';
import { formatFileSize, FILE_SIZE_WARN_BYTES, FILE_SIZE_LIMIT_DESKTOP_BYTES, FILE_SIZE_LIMIT_MOBILE_BYTES } from '@/config/constants';

interface FileDropZoneProps {
  accept?: string;
  maxSizeMB?: number;
  onFileSelect: (file: File) => void;
  label?: string;
  sublabel?: string;
  multiple?: boolean;
  onMultipleFiles?: (files: File[]) => void;
  disabled?: boolean;
}

export function FileDropZone({
  accept,
  onFileSelect,
  label = 'Drop your file here',
  sublabel = 'or click to browse',
  multiple = false,
  onMultipleFiles,
  disabled = false,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const maxBytes = isMobile ? FILE_SIZE_LIMIT_MOBILE_BYTES : FILE_SIZE_LIMIT_DESKTOP_BYTES;

  const validateAndSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0 || disabled) return;
      setError(null);
      setWarning(null);

      if (multiple && onMultipleFiles) {
        const validFiles: File[] = [];
        for (let i = 0; i < files.length; i++) {
          if (files[i].size > maxBytes) {
            setError(`${files[i].name} exceeds ${formatFileSize(maxBytes)} limit`);
            return;
          }
          validFiles.push(files[i]);
        }
        const hasLarge = validFiles.some(f => f.size > FILE_SIZE_WARN_BYTES);
        if (hasLarge) {
          setWarning('One or more files are large. Processing may be slow and use significant memory.');
        }
        onMultipleFiles(validFiles);
        return;
      }

      const file = files[0];
      if (file.size > maxBytes) {
        setError(`File exceeds ${formatFileSize(maxBytes)} limit (${formatFileSize(file.size)})`);
        return;
      }
      if (file.size > FILE_SIZE_WARN_BYTES) {
        setWarning(`Large file (${formatFileSize(file.size)}). Processing may be slow and use significant memory.`);
      }
      onFileSelect(file);
    },
    [maxBytes, onFileSelect, multiple, onMultipleFiles, disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled) validateAndSelect(e.dataTransfer.files);
    },
    [validateAndSelect, disabled]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-all ${
        disabled
          ? 'cursor-not-allowed opacity-50 border-border'
          : isDragging
            ? 'cursor-pointer border-primary bg-primary/5 scale-[1.01]'
            : 'cursor-pointer border-border hover:border-primary/50 hover:bg-secondary/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
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

      {warning && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-amber-500">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive font-medium">{error}</p>
      )}
    </div>
  );
}
