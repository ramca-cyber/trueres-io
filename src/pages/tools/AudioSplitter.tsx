import { useState, useEffect, useCallback } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT, formatFileSize } from '@/config/constants';
import { useAudioPreview } from '@/hooks/use-audio-preview';
import { trimArgs } from '@/engines/processing/presets';
import { writeInputFile, exec, readOutputFile, deleteFile, getFFmpeg, isFFmpegLoaded } from '@/engines/processing/ffmpeg-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, X, Download, RotateCcw } from 'lucide-react';
import { cacheFile, getCachedFile, clearCachedFile } from '@/lib/file-cache';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { computeWaveform } from '@/engines/analysis/modules/waveform';
import React from 'react';

const TOOL_ID = 'audio-splitter';
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

const SPLIT_MARKER_COLOR = 'hsl(0, 84%, 60%)';
const WAVEFORM_COLOR = 'hsl(0, 0%, 64%)';
const BG_COLOR = 'hsl(0, 0%, 7%)';
const SEGMENT_COLORS = [
  'hsla(30, 83%, 63%, 0.2)',
  'hsla(200, 83%, 63%, 0.2)',
  'hsla(120, 60%, 50%, 0.2)',
  'hsla(280, 70%, 60%, 0.2)',
  'hsla(50, 90%, 55%, 0.2)',
];

const AudioSplitter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [splitPoints, setSplitPoints] = useState<number[]>([]);
  const [manualTime, setManualTime] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { audioBuffer, duration, decoding } = useAudioPreview(file);

  // Canvas refs
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const waveformRef = React.useRef<{ peaks: Float32Array; rms: Float32Array } | null>(null);

  // Restore cached file
  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) { setFile(pending); cacheFile(`${TOOL_ID}-input`, pending); return; }
    getCachedFile(`${TOOL_ID}-input`).then(f => { if (f) setFile(f); });
  }, []);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setSplitPoints([]);
    setSegments([]);
    setError(null);
    cacheFile(`${TOOL_ID}-input`, f);
  };

  // Compute waveform
  useEffect(() => {
    if (!audioBuffer) return;
    const channelData = audioBuffer.getChannelData(0);
    waveformRef.current = computeWaveform(channelData, canvasWidth);
  }, [audioBuffer, canvasWidth]);

  // Observe container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setCanvasWidth(Math.floor(w));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Sorted split points
  const sortedPoints = [...splitPoints].sort((a, b) => a - b);

  // Compute segments from split points
  const computedSegments: { start: number; end: number }[] = [];
  if (duration > 0) {
    const pts = [0, ...sortedPoints, duration];
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i + 1] - pts[i] > 0.01) {
        computedSegments.push({ start: pts[i], end: pts[i + 1] });
      }
    }
  }

  // Draw waveform with split markers
  useEffect(() => {
    const canvas = canvasRef.current;
    const wf = waveformRef.current;
    if (!canvas || !wf || !duration) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvasWidth;
    const h = 120;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Segment backgrounds
    computedSegments.forEach((seg, i) => {
      const x1 = (seg.start / duration) * w;
      const x2 = (seg.end / duration) * w;
      ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      ctx.fillRect(x1, 0, x2 - x1, h);
    });

    // Waveform
    const numBuckets = wf.peaks.length;
    const mid = h / 2;
    for (let i = 0; i < numBuckets; i++) {
      const x = (i / numBuckets) * w;
      const peakH = wf.peaks[i] * mid;
      ctx.fillStyle = WAVEFORM_COLOR;
      ctx.fillRect(x, mid - peakH, Math.max(1, w / numBuckets), peakH * 2);
    }

    // Split markers
    sortedPoints.forEach(pt => {
      const x = (pt / duration) * w;
      ctx.strokeStyle = SPLIT_MARKER_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Triangle marker
      ctx.fillStyle = SPLIT_MARKER_COLOR;
      ctx.beginPath();
      ctx.moveTo(x - 5, 0);
      ctx.lineTo(x + 5, 0);
      ctx.lineTo(x, 8);
      ctx.closePath();
      ctx.fill();
    });

    // Time labels
    ctx.fillStyle = 'hsl(0, 0%, 95%)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0:00', 4, h - 4);
    ctx.textAlign = 'right';
    ctx.fillText(formatTime(duration), w - 4, h - 4);
  }, [canvasWidth, duration, sortedPoints, audioBuffer, computedSegments]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = (x / rect.width) * duration;
    // Don't add if too close to existing point or edges
    const minGap = duration * 0.01;
    if (t < minGap || t > duration - minGap) return;
    if (sortedPoints.some(p => Math.abs(p - t) < minGap)) return;
    setSplitPoints(prev => [...prev, parseFloat(t.toFixed(2))]);
    setSegments([]);
  }, [duration, sortedPoints]);

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

      const ext = file.name.split('.').pop() || 'mp3';
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
          mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
          aac: 'audio/aac', m4a: 'audio/mp4', ogg: 'audio/ogg',
          aiff: 'audio/aiff', opus: 'audio/ogg',
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
    const ext = file.name.split('.').pop() || 'mp3';
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
    clearCachedFile(`${TOOL_ID}-input`);
  };

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={handleFileSelect} label="Drop your audio file here" sublabel="Any supported audio format" />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />

          {decoding && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Decoding audio...
            </div>
          )}

          {audioBuffer && (
            <>
              {/* Waveform */}
              <div ref={containerRef}>
                <canvas
                  ref={canvasRef}
                  className="w-full rounded-md border border-border cursor-crosshair"
                  style={{ height: 120 }}
                  onClick={handleCanvasClick}
                />
                <p className="text-xs text-muted-foreground mt-1">Click on the waveform to add split points</p>
              </div>

              {/* Manual time input */}
              <div className="flex gap-2 items-end">
                <div className="space-y-1 flex-1">
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
                            style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length].replace('0.2', '0.7') }}
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
                            {/* Remove split point (only if between segments, i.e., i > 0) */}
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

export default AudioSplitter;
