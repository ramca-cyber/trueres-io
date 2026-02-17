import { useState, useCallback, useRef } from 'react';
import { GripVertical, X, Volume2, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/config/constants';
import { cn } from '@/lib/utils';

export interface QueueItem {
  id: string;
  file: File;
  playbackSrc?: File | Blob;
  isVideo: boolean;
  status: 'pending' | 'transcoding' | 'ready' | 'error';
  progress?: number;
}

interface PlaylistPanelProps {
  queue: QueueItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddFiles: () => void;
  onClear: () => void;
}

export function PlaylistPanel({
  queue,
  currentIndex,
  onSelect,
  onRemove,
  onReorder,
  onAddFiles,
  onClear,
}: PlaylistPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndex;
    setDragIndex(null);
    setDropTarget(null);
    dragCounter.current = 0;
    if (fromIndex !== null && fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
  }, [dragIndex, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropTarget(null);
    dragCounter.current = 0;
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-sm font-medium text-foreground">
          Queue <span className="text-muted-foreground">({queue.length} track{queue.length !== 1 ? 's' : ''})</span>
        </span>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAddFiles}>
            + Add
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={onClear}>
            Clear
          </Button>
        </div>
      </div>

      {/* Track list */}
      <ScrollArea className="max-h-[280px]">
        <div className="divide-y divide-border">
          {queue.map((item, index) => {
            const isCurrent = index === currentIndex;
            const isDragging = dragIndex === index;
            const isDropTarget = dropTarget === index && dragIndex !== null && dragIndex !== index;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelect(index)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors select-none',
                  isCurrent ? 'bg-primary/10' : 'hover:bg-secondary/50',
                  isDragging && 'opacity-40',
                  isDropTarget && 'border-t-2 border-t-primary',
                )}
              >
                {/* Drag handle */}
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />

                {/* Track number / status indicator */}
                <div className="w-6 text-center shrink-0">
                  {item.status === 'transcoding' ? (
                    <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin mx-auto" />
                  ) : isCurrent ? (
                    <Volume2 className="h-3.5 w-3.5 text-primary mx-auto" />
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">{String(index + 1).padStart(2, '0')}</span>
                  )}
                </div>

                {/* Filename */}
                <span className={cn(
                  'text-sm truncate flex-1 min-w-0',
                  isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}>
                  {item.file.name}
                </span>

                {/* File size */}
                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                  {formatFileSize(item.file.size)}
                </span>

                {/* Remove button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                  className="shrink-0 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
