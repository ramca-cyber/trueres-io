import React, { useRef, useEffect, useState, useCallback } from 'react';
import { computeWaveform } from '@/engines/analysis/modules/waveform';

interface InteractiveWaveformProps {
  audioBuffer: AudioBuffer;
  startTime: number;
  endTime: number;
  onStartChange: (t: number) => void;
  onEndChange: (t: number) => void;
  currentTime: number;
  onSeek?: (t: number) => void;
  onTogglePlay?: () => void;
  className?: string;
}

const HANDLE_WIDTH = 8;
const HANDLE_COLOR = 'hsl(30, 83%, 63%)'; // primary
const PLAYHEAD_COLOR = 'hsl(0, 84%, 60%)';
const SELECTION_COLOR = 'hsla(30, 83%, 63%, 0.15)';
const WAVEFORM_COLOR = 'hsl(0, 0%, 64%)';
const WAVEFORM_SELECTED_COLOR = 'hsl(30, 83%, 63%)';
const BG_COLOR = 'hsl(0, 0%, 7%)';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

export const InteractiveWaveform = ({
  audioBuffer,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  currentTime,
  onSeek,
  onTogglePlay,
  className,
}: InteractiveWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const [hovering, setHovering] = useState<'start' | 'end' | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [lastHandle, setLastHandle] = useState<'start' | 'end'>('end');
  const waveformRef = useRef<{ peaks: Float32Array; rms: Float32Array } | null>(null);
  const duration = audioBuffer.duration;

  // Compute waveform data once
  useEffect(() => {
    const channelData = audioBuffer.getChannelData(0);
    const data = computeWaveform(channelData, canvasWidth);
    waveformRef.current = data;
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      onTogglePlay?.();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      const step = e.shiftKey ? 1 : 0.1;
      if (lastHandle === 'start') {
        onStartChange(Math.max(0, startTime - step));
      } else {
        onEndChange(Math.max(startTime + 0.1, endTime - step));
      }
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      const step = e.shiftKey ? 1 : 0.1;
      if (lastHandle === 'start') {
        onStartChange(Math.min(endTime - 0.1, startTime + step));
      } else {
        onEndChange(Math.min(duration, endTime + step));
      }
    } else if (e.code === 'Tab') {
      e.preventDefault();
      setLastHandle(prev => prev === 'start' ? 'end' : 'start');
    }
  }, [startTime, endTime, duration, lastHandle, onStartChange, onEndChange, onTogglePlay]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const wf = waveformRef.current;
    if (!canvas || !wf) return;

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

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Selection region
    const startX = (startTime / duration) * w;
    const endX = (endTime / duration) * w;
    ctx.fillStyle = SELECTION_COLOR;
    ctx.fillRect(startX, 0, endX - startX, h);

    // Waveform
    const numBuckets = wf.peaks.length;
    const mid = h / 2;
    for (let i = 0; i < numBuckets; i++) {
      const x = (i / numBuckets) * w;
      const t = (i / numBuckets) * duration;
      const inSelection = t >= startTime && t <= endTime;
      const peakH = wf.peaks[i] * mid;

      ctx.fillStyle = inSelection ? WAVEFORM_SELECTED_COLOR : WAVEFORM_COLOR;
      ctx.fillRect(x, mid - peakH, Math.max(1, w / numBuckets), peakH * 2);
    }

    // Start handle
    ctx.fillStyle = HANDLE_COLOR;
    ctx.fillRect(startX - 2, 0, 4, h);
    ctx.beginPath();
    ctx.moveTo(startX - 6, 0);
    ctx.lineTo(startX + 6, 0);
    ctx.lineTo(startX + 6, 14);
    ctx.lineTo(startX, 20);
    ctx.lineTo(startX - 6, 14);
    ctx.closePath();
    ctx.fill();

    // End handle
    ctx.fillRect(endX - 2, 0, 4, h);
    ctx.beginPath();
    ctx.moveTo(endX - 6, 0);
    ctx.lineTo(endX + 6, 0);
    ctx.lineTo(endX + 6, 14);
    ctx.lineTo(endX, 20);
    ctx.lineTo(endX - 6, 14);
    ctx.closePath();
    ctx.fill();

    // Playhead
    const playX = (currentTime / duration) * w;
    ctx.strokeStyle = PLAYHEAD_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, h);
    ctx.stroke();

    // Time labels
    ctx.fillStyle = 'hsl(0, 0%, 95%)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(formatTime(startTime), Math.max(20, startX), h - 4);
    ctx.fillText(formatTime(endTime), Math.min(w - 20, endX), h - 4);
  }, [canvasWidth, startTime, endTime, currentTime, duration, audioBuffer]);

  const getTimeFromX = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(duration, (x / rect.width) * duration));
  }, [duration]);

  const isOverHandle = useCallback((clientX: number): 'start' | 'end' | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const px = clientX - rect.left;
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    if (Math.abs(px - startX) < HANDLE_WIDTH * 2) return 'start';
    if (Math.abs(px - endX) < HANDLE_WIDTH * 2) return 'end';
    return null;
  }, [startTime, endTime, duration, canvasWidth]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const t = getTimeFromX(e.clientX);
    const handle = isOverHandle(e.clientX);

    if (handle) {
      setDragging(handle);
      setLastHandle(handle);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (onSeek) {
      onSeek(t);
    }
  }, [getTimeFromX, isOverHandle, onSeek]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Update hover state for cursor
    if (!dragging) {
      setHovering(isOverHandle(e.clientX));
    }

    if (!dragging) return;
    const t = getTimeFromX(e.clientX);
    if (dragging === 'start') {
      onStartChange(Math.min(t, endTime - 0.1));
    } else {
      onEndChange(Math.max(t, startTime + 0.1));
    }
  }, [dragging, getTimeFromX, startTime, endTime, onStartChange, onEndChange, isOverHandle]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (!dragging) setHovering(null);
  }, [dragging]);

  const cursorClass = dragging || hovering ? 'cursor-ew-resize' : 'cursor-crosshair';

  return (
    <div ref={containerRef} className={className} tabIndex={0} onKeyDown={handleKeyDown}
      aria-label="Waveform editor. Tab to switch handle, arrow keys to nudge, Space to play."
      style={{ outline: 'none' }}
      onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 2px hsl(30,83%,63%)')}
      onBlur={e => (e.currentTarget.style.boxShadow = '')}>
      <canvas
        ref={canvasRef}
        className={`w-full rounded-md border border-border ${cursorClass}`}
        style={{ height: 120, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
        <span>0:00</span>
        <span className="text-[10px] opacity-60">
          Space: play · ←→: nudge {lastHandle} · Tab: switch handle
        </span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};
