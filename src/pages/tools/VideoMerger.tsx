import { useState, useRef } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT, formatFileSize } from '@/config/constants';
import { videoMergeArgs, VIDEO_OUTPUT_FORMATS } from '@/engines/processing/presets';
import { writeInputFile, exec, readOutputFile, deleteFile, getFFmpeg, isFFmpegLoaded } from '@/engines/processing/ffmpeg-manager';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, GripVertical, X, Plus, RotateCcw } from 'lucide-react';

const TOOL_ID = 'video-merger';
const tool = getToolById(TOOL_ID)!;

const VideoMerger = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const addMoreRef = useRef<HTMLInputElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleFilesSelect = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    setOutputBlob(null);
    setError(null);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setOutputBlob(null);
  };

  const moveFile = (from: number, to: number) => {
    setFiles(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setOutputBlob(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setError(null);
    setProcessing(true);
    setProgress(0);
    setOutputBlob(null);

    try {
      if (!isFFmpegLoaded()) {
        setLoading(true);
        await getFFmpeg();
        setLoading(false);
      }

      const inputNames: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const name = `input_${i}_${files[i].name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        inputNames.push(name);
        await writeInputFile(name, files[i]);
        setProgress(Math.round(((i + 1) / files.length) * 30));
      }

      const fileListContent = inputNames.map(n => `file '${n}'`).join('\n');
      const encoder = new TextEncoder();
      await writeInputFile('filelist.txt', encoder.encode(fileListContent));

      const fmt = VIDEO_OUTPUT_FORMATS.find(f => f.value === outputFormat);
      const ext = fmt?.ext || 'mp4';
      const outName = `merged.${ext}`;

      const args = videoMergeArgs('filelist.txt', outName, outputFormat);
      await exec(args, (p) => setProgress(30 + Math.round(p * 0.65)));

      const data = await readOutputFile(outName);

      for (const name of inputNames) await deleteFile(name);
      await deleteFile('filelist.txt');
      await deleteFile(outName);

      const mimeMap: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm' };
      const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeMap[ext] || 'application/octet-stream' });
      setOutputBlob(blob);
      setProgress(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed');
    } finally {
      setProcessing(false);
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setOutputBlob(null);
    setError(null);
    setProgress(0);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      moveFile(dragIdx, idx);
      setDragIdx(idx);
    }
  };
  const handleDragEnd = () => setDragIdx(null);

  const fmt = VIDEO_OUTPUT_FORMATS.find(f => f.value === outputFormat);

  return (
    <ToolPage tool={tool}>
      {files.length === 0 ? (
        <FileDropZone
          accept={VIDEO_ACCEPT}
          onFileSelect={(f) => handleFilesSelect([f])}
          multiple
          onMultipleFiles={handleFilesSelect}
          label="Drop your video files here"
          sublabel="Select 2 or more files to merge"
        />
      ) : (
        <div className="space-y-4">
          {/* File list */}
          <div className="rounded-lg border border-border bg-card">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium text-foreground">{files.length} files — drag to reorder</p>
            </div>
            <div className="divide-y divide-border">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    dragIdx === i ? 'bg-primary/10' : 'hover:bg-secondary/50'
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                  <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                  <span className="truncate flex-1 text-foreground">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add more files */}
          <input
            ref={addMoreRef}
            type="file"
            accept={VIDEO_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFilesSelect(Array.from(e.target.files));
              e.target.value = '';
            }}
          />

          {/* Settings */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Output Format</label>
            <Select value={outputFormat} onValueChange={(v) => { setOutputFormat(v); setOutputBlob(null); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VIDEO_OUTPUT_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress */}
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && !loading && <ProgressBar value={progress} label="Merging videos..." sublabel={`${progress}%`} />}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleMerge} disabled={files.length < 2 || processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Merging...' : `Merge ${files.length} files`}
            </Button>
            <Button variant="outline" size="sm" onClick={() => addMoreRef.current?.click()} disabled={processing}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add files
            </Button>
            <Button variant="outline" size="sm" className="ml-auto border-destructive/50 text-destructive hover:bg-destructive/10" onClick={handleClear} disabled={processing}>
              <RotateCcw className="h-3 w-3 mr-1.5" /> Start over
            </Button>
          </div>

          {/* Output */}
          {outputBlob && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Merge complete! {formatFileSize(outputBlob.size)}
              </p>
              <VideoPlayer src={outputBlob} label="Merged output" />
              <DownloadButton blob={outputBlob} filename={`merged.${fmt?.ext || 'mp4'}`} label={`Download merged ${fmt?.label || 'video'}`} />
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};

export default VideoMerger;
