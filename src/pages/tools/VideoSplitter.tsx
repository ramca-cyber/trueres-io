import { useState, useRef, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT, formatFileSize } from '@/config/constants';
import { trimArgs } from '@/engines/processing/presets';
import { writeInputFile, exec, readOutputFile, deleteFile, getFFmpeg, isFFmpegLoaded } from '@/engines/processing/ffmpeg-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, X, Download, RotateCcw, Clock } from 'lucide-react';
import { useFileTransferStore } from '@/stores/file-transfer-store';

const TOOL_ID = 'video-splitter';
const tool = getToolById(TOOL_ID)!;

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

interface Segment {
  start: number;
  end: number;
  blob?: Blob;
}

const SEGMENT_COLORS = [
  'hsla(30, 83%, 63%, 0.35)',
  'hsla(200, 83%, 63%, 0.35)',
  'hsla(120, 60%, 50%, 0.35)',
  'hsla(280, 70%, 60%, 0.35)',
  'hsla(50, 90%, 55%, 0.35)',
];

const VideoSplitter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [splitPoints, setSplitPoints] = useState<number[]>([]);
  const [manualTime, setManualTime] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) setFile(pending);
  }, []);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setSplitPoints([]);
    setSegments([]);
    setError(null);
    setDuration(0);
  };

  // Get duration from video element
  const handleVideoLoaded = () => {
    if (videoRef.current && videoRef.current.duration && isFinite(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
  };

  const sortedPoints = [...splitPoints].sort((a, b) => a - b);

  const computedSegments: { start: number; end: number }[] = [];
  if (duration > 0) {
    const pts = [0, ...sortedPoints, duration];
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i + 1] - pts[i] > 0.01) {
        computedSegments.push({ start: pts[i], end: pts[i + 1] });
      }
    }
  }

  const addFromPlayback = () => {
    if (!videoRef.current || !duration) return;
    const t = parseFloat(videoRef.current.currentTime.toFixed(1));
    if (t <= 0 || t >= duration) return;
    const minGap = duration * 0.01;
    if (sortedPoints.some(p => Math.abs(p - t) < minGap)) return;
    setSplitPoints(prev => [...prev, t]);
    setSegments([]);
  };

  const addManualPoint = () => {
    const t = parseFloat(manualTime);
    if (isNaN(t) || t <= 0 || t >= duration) return;
    const minGap = duration * 0.01;
    if (sortedPoints.some(p => Math.abs(p - t) < minGap)) return;
    setSplitPoints(prev => [...prev, parseFloat(t.toFixed(2))]);
    setManualTime('');
    setSegments([]);
  };

  const removeSplitPoint = (pt: number) => {
    setSplitPoints(prev => prev.filter(p => p !== pt));
    setSegments([]);
  };

  const handleSplit = async () => {
    if (!file || computedSegments.length < 2) return;
    setError(null);
    setProcessing(true);
    setProgress(0);
    setSegments([]);

    try {
      if (!isFFmpegLoaded()) {
        setLoading(true);
        await getFFmpeg();
        setLoading(false);
      }

      const inputName = `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await writeInputFile(inputName, file);

      const ext = file.name.split('.').pop() || 'mp4';
      const results: Segment[] = [];

      for (let i = 0; i < computedSegments.length; i++) {
        setCurrentSegment(i + 1);
        const seg = computedSegments[i];
        const outName = `segment_${i + 1}.${ext}`;
        const args = trimArgs(inputName, outName, seg.start, seg.end);
        await exec(args, (p) => {
          setProgress(Math.round(((i + p / 100) / computedSegments.length) * 100));
        });

        const data = await readOutputFile(outName);
        await deleteFile(outName);

        const mimeMap: Record<string, string> = {
          mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo',
          mkv: 'video/x-matroska', mov: 'video/quicktime',
        };
        const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeMap[ext] || 'application/octet-stream' });
        results.push({ start: seg.start, end: seg.end, blob });
      }

      await deleteFile(inputName);
      setSegments(results);
      setProgress(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Split failed');
    } finally {
      setProcessing(false);
      setLoading(false);
    }
  };

  const downloadSegment = (seg: Segment, idx: number) => {
    if (!seg.blob || !file) return;
    const ext = file.name.split('.').pop() || 'mp4';
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(seg.blob);
    a.download = `${baseName}_part${idx + 1}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadAll = async () => {
    for (let i = 0; i < segments.length; i++) {
      downloadSegment(segments[i], i);
      if (i < segments.length - 1) await new Promise(r => setTimeout(r, 300));
    }
  };

  const handleClear = () => {
    setFile(null);
    setSplitPoints([]);
    setSegments([]);
    setError(null);
    setProgress(0);
    setDuration(0);
  };

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={VIDEO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your video file here" sublabel="MP4, WebM, AVI, MKV, MOV" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />

          <VideoPlayer
            ref={videoRef}
            src={file}
            label="Input video"
            onEnded={handleVideoLoaded}
          />

          {/* Duration detection via hidden handler */}
          <video
            src={URL.createObjectURL(file)}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.duration && isFinite(v.duration)) setDuration(v.duration);
              URL.revokeObjectURL(v.src);
            }}
            className="hidden"
            preload="metadata"
          />

          {duration > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                Duration: {formatTime(duration)}
              </p>

              {/* Add split point controls */}
              <div className="flex gap-2 items-end flex-wrap">
                <div className="space-y-1 flex-1 min-w-[140px]">
                  <label className="text-xs font-medium text-muted-foreground">Add split point (seconds)</label>
                  <Input
                    type="number"
                    min="0.1"
                    max={duration - 0.1}
                    step="0.1"
                    placeholder="e.g. 30.0"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addManualPoint()}
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={addManualPoint} disabled={!manualTime}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
                <Button variant="outline" size="sm" onClick={addFromPlayback} title="Set split point at current playback time">
                  <Clock className="h-3.5 w-3.5 mr-1" /> Current time
                </Button>
              </div>

              {/* Segment list */}
              {computedSegments.length > 0 && (
                <div className="rounded-lg border border-border bg-card">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{computedSegments.length} segments</p>
                  </div>
                  <div className="divide-y divide-border">
                    {computedSegments.map((seg, i) => {
                      const segResult = segments[i];
                      return (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                          <div
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length].replace('0.35', '0.8') }}
                          />
                          <span className="font-mono text-xs text-muted-foreground w-5">{i + 1}</span>
                          <span className="text-foreground">{formatTime(seg.start)} → {formatTime(seg.end)}</span>
                          <span className="text-xs text-muted-foreground">({(seg.end - seg.start).toFixed(1)}s)</span>
                          <div className="ml-auto flex items-center gap-1.5">
                            {segResult?.blob && (
                              <>
                                <span className="text-xs text-muted-foreground">{formatFileSize(segResult.blob.size)}</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => downloadSegment(segResult, i)}>
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {i > 0 && (
                              <button
                                onClick={() => removeSplitPoint(sortedPoints[i - 1])}
                                className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Remove this split point"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Progress */}
          {loading && <ProgressBar value={-1} label="Loading processing engine..." sublabel="Downloading ~30 MB (first time only)" />}
          {processing && !loading && (
            <ProgressBar value={progress} label={`Splitting segment ${currentSegment}/${computedSegments.length}...`} sublabel={`${progress}%`} />
          )}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleSplit} disabled={computedSegments.length < 2 || processing || loading}>
              {(processing || loading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Loading engine...' : processing ? 'Splitting...' : `Split into ${computedSegments.length} segments`}
            </Button>
            {segments.length > 0 && segments.every(s => s.blob) && (
              <Button variant="secondary" onClick={downloadAll}>
                <Download className="h-4 w-4 mr-2" /> Download All
              </Button>
            )}
            <Button variant="outline" size="sm" className="ml-auto border-destructive/50 text-destructive hover:bg-destructive/10" onClick={handleClear} disabled={processing}>
              <RotateCcw className="h-3 w-3 mr-1.5" /> Start over
            </Button>
          </div>
        </div>
      )}
    </ToolPage>
  );
};

export default VideoSplitter;
