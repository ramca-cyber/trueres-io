import { Download, X, RotateCcw, CheckCircle2, AlertCircle, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { formatFileSize } from '@/config/constants';
import type { BatchItem, BatchJob } from '@/hooks/use-batch-process';

interface BatchQueueProps {
  queue: BatchItem[];
  isProcessing: boolean;
  engineLoading: boolean;
  engineError: string | null;
  doneCount: number;
  allDone: boolean;
  onRemoveFile: (index: number) => void;
  onRetryItem: (index: number) => void;
  onDownloadAll: () => void;
  onAddMore: () => void;
}

export function BatchQueue({
  queue,
  isProcessing,
  engineLoading,
  engineError,
  doneCount,
  allDone,
  onRemoveFile,
  onRetryItem,
  onDownloadAll,
  onAddMore,
}: BatchQueueProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {engineLoading && (
        <div className="p-3 border-b border-border">
          <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />
        </div>
      )}

      {engineError && (
        <div className="p-3 border-b border-border bg-destructive/5">
          <p className="text-sm text-destructive">{engineError}</p>
        </div>
      )}

      <div className="divide-y divide-border">
        {queue.map((item, i) => (
          <div key={`${item.file.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{item.file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
            </div>

            {item.status === 'pending' && (
              <Badge variant="secondary" className="shrink-0">Pending</Badge>
            )}

            {item.status === 'processing' && (
              <div className="flex items-center gap-2 shrink-0">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground w-8">{item.progress}%</span>
              </div>
            )}

            {item.status === 'done' && (
              <div className="flex items-center gap-2 shrink-0">
                {item.outputBlob && (
                  <span className="text-xs text-muted-foreground">{formatFileSize(item.outputBlob.size)}</span>
                )}
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {item.outputBlob && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      const url = URL.createObjectURL(item.outputBlob!);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = item.outputName;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}

            {item.status === 'error' && (
              <div className="flex items-center gap-2 shrink-0">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onRetryItem(i)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {!isProcessing && item.status !== 'processing' && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => onRemoveFile(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-secondary/30 text-sm">
        <span className="text-muted-foreground">
          {isProcessing
            ? `Processing ${doneCount + 1} of ${queue.length}...`
            : allDone
              ? `All ${queue.length} files complete`
              : `${queue.length} file${queue.length !== 1 ? 's' : ''} queued`
          }
        </span>
        <div className="flex items-center gap-2">
          {!isProcessing && (
            <Button variant="ghost" size="sm" onClick={onAddMore} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add more
            </Button>
          )}
          {allDone && (
            <Button size="sm" onClick={onDownloadAll} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Download all
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
