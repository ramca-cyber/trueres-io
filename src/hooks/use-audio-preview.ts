import { useState, useEffect, useRef, useCallback } from 'react';

export type ChannelMode = 'stereo' | 'left' | 'right' | 'mono' | 'swap';

interface UseAudioPreviewReturn {
  audioBuffer: AudioBuffer | null;
  duration: number;
  isPlaying: boolean;
  currentTime: number;
  decoding: boolean;
  playRegion: (startSec: number, endSec: number) => void;
  playWithGain: (gainDb: number, startSec?: number, endSec?: number) => void;
  playChannel: (mode: ChannelMode, startSec?: number, endSec?: number) => void;
  stop: () => void;
  seekTo: (time: number) => void;
}

export function useAudioPreview(file: File | null): UseAudioPreviewReturn {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0); // AudioContext time when playback started
  const offsetRef = useRef(0);    // offset into buffer when playback started

  // Get or create AudioContext
  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  // Decode file when it changes
  useEffect(() => {
    if (!file) {
      setAudioBuffer(null);
      setCurrentTime(0);
      return;
    }

    let cancelled = false;
    setDecoding(true);

    const decode = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const ctx = getCtx();
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        if (!cancelled) {
          setAudioBuffer(buffer);
          setCurrentTime(0);
        }
      } catch (e) {
        console.error('Failed to decode audio:', e);
      } finally {
        if (!cancelled) setDecoding(false);
      }
    };

    decode();
    return () => { cancelled = true; };
  }, [file, getCtx]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      sourceRef.current?.stop();
      sourceRef.current?.disconnect();
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close();
      }
    };
  }, []);

  // Animation frame loop for currentTime
  const startTimeTracking = useCallback((ctx: AudioContext, offset: number, endSec: number) => {
    startTimeRef.current = ctx.currentTime;
    offsetRef.current = offset;

    const tick = () => {
      const elapsed = ctx.currentTime - startTimeRef.current;
      const t = offset + elapsed;
      if (t >= endSec) {
        setCurrentTime(endSec);
        setIsPlaying(false);
        return;
      }
      setCurrentTime(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playRegion = useCallback((startSec: number, endSec: number) => {
    if (!audioBuffer) return;
    stop();

    const ctx = getCtx();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => {
      setIsPlaying(false);
      cancelAnimationFrame(rafRef.current);
    };

    const duration = endSec - startSec;
    source.start(0, startSec, duration);
    sourceRef.current = source;
    setIsPlaying(true);
    startTimeTracking(ctx, startSec, endSec);
  }, [audioBuffer, stop, getCtx, startTimeTracking]);

  const playWithGain = useCallback((gainDb: number, startSec?: number, endSec?: number) => {
    if (!audioBuffer) return;
    stop();

    const ctx = getCtx();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = Math.pow(10, gainDb / 20);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    const s = startSec ?? 0;
    const e = endSec ?? audioBuffer.duration;
    source.onended = () => {
      setIsPlaying(false);
      cancelAnimationFrame(rafRef.current);
    };

    source.start(0, s, e - s);
    sourceRef.current = source;
    setIsPlaying(true);
    startTimeTracking(ctx, s, e);
  }, [audioBuffer, stop, getCtx, startTimeTracking]);

  const playChannel = useCallback((mode: ChannelMode, startSec?: number, endSec?: number) => {
    if (!audioBuffer) return;
    stop();

    const ctx = getCtx();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    const s = startSec ?? 0;
    const e = endSec ?? audioBuffer.duration;

    if (mode === 'stereo' || audioBuffer.numberOfChannels === 1) {
      source.connect(ctx.destination);
    } else {
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      source.connect(splitter);

      switch (mode) {
        case 'left':
          splitter.connect(merger, 0, 0);
          splitter.connect(merger, 0, 1);
          break;
        case 'right':
          splitter.connect(merger, 1, 0);
          splitter.connect(merger, 1, 1);
          break;
        case 'mono': {
          const gain0 = ctx.createGain();
          const gain1 = ctx.createGain();
          gain0.gain.value = 0.5;
          gain1.gain.value = 0.5;
          splitter.connect(gain0, 0);
          splitter.connect(gain1, 1);
          gain0.connect(merger, 0, 0);
          gain1.connect(merger, 0, 0);
          gain0.connect(merger, 0, 1);
          gain1.connect(merger, 0, 1);
          break;
        }
        case 'swap':
          splitter.connect(merger, 0, 1);
          splitter.connect(merger, 1, 0);
          break;
      }
      merger.connect(ctx.destination);
    }

    source.onended = () => {
      setIsPlaying(false);
      cancelAnimationFrame(rafRef.current);
    };

    source.start(0, s, e - s);
    sourceRef.current = source;
    setIsPlaying(true);
    startTimeTracking(ctx, s, e);
  }, [audioBuffer, stop, getCtx, startTimeTracking]);

  const seekTo = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  return {
    audioBuffer,
    duration: audioBuffer?.duration ?? 0,
    isPlaying,
    currentTime,
    decoding,
    playRegion,
    playWithGain,
    playChannel,
    stop,
    seekTo,
  };
}
