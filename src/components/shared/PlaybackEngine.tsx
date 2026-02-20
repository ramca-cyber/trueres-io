import { useEffect, useRef } from 'react';
import { useMiniPlayerStore } from '@/stores/mini-player-store';
import { usePlaybackContext } from '@/context/PlaybackContext';
import { register, unregister } from '@/lib/playback-manager';

export function PlaybackEngine() {
  const {
    audioRef, videoRef,
    onTrackEndRef, _setAnalyserNode, _setAudioNodes,
  } = usePlaybackContext();

  const urlRef = useRef('');
  const ctxRef = useRef<AudioContext | null>(null);
  const prevTrackKeyRef = useRef('');

  // ── Build Web Audio graph once on mount ──
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(el);

    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 250;

    const midFilter = ctx.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.value = 1000;
    midFilter.Q.value = 1;

    const trebleFilter = ctx.createBiquadFilter();
    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = 4000;

    const gain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    source.connect(bassFilter).connect(midFilter).connect(trebleFilter)
      .connect(gain).connect(analyser).connect(ctx.destination);

    ctxRef.current = ctx;
    _setAnalyserNode(analyser);
    _setAudioNodes({ gainNode: gain, bassFilter, midFilter, trebleFilter });

    register(el);

    return () => {
      unregister(el);
      ctx.close().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Register video element with playback manager ──
  useEffect(() => {
    const el = videoRef.current;
    if (el) register(el);
    return () => { if (el) unregister(el); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Read store state ──
  const { active, queue, currentIndex, isPlaying } = useMiniPlayerStore();
  const current = active ? queue[currentIndex] : undefined;
  const trackKey = current
    ? `${current.id}::${current.playbackSrc instanceof Blob ? current.playbackSrc.size : 'file'}`
    : '';

  // ── Update source when track changes ──
  useEffect(() => {
    if (prevTrackKeyRef.current === trackKey && trackKey !== '') return;
    prevTrackKeyRef.current = trackKey;

    if (!current?.playbackSrc) {
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = ''; }
      const a = audioRef.current;
      if (a && a.src) { a.pause(); a.removeAttribute('src'); a.load(); }
      const v = videoRef.current;
      if (v && v.src) { v.pause(); v.removeAttribute('src'); v.load(); }
      return;
    }

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const u = URL.createObjectURL(current.playbackSrc);
    urlRef.current = u;

    const el = current.isVideo ? videoRef.current : audioRef.current;
    const other = current.isVideo ? audioRef.current : videoRef.current;

    if (other && other.src) { other.pause(); other.removeAttribute('src'); other.load(); }
    if (el) {
      el.src = u;
      el.volume = 1; // Reset for crossfade scenarios
      el.load();
    }

    // Resume AudioContext if suspended
    if (!current.isVideo && ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
  }, [trackKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Play / pause sync ──
  useEffect(() => {
    if (!current?.playbackSrc) return;
    const el = current.isVideo ? videoRef.current : audioRef.current;
    if (!el || !el.src) return;

    if (isPlaying) {
      const doPlay = () => el.play().catch(() => {});
      if (el.readyState >= 2) doPlay();
      else el.addEventListener('canplay', doPlay, { once: true });

      if (!current.isVideo && ctxRef.current?.state === 'suspended') {
        ctxRef.current.resume().catch(() => {});
      }
    } else {
      if (!el.paused) el.pause();
    }
  }, [isPlaying, trackKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Event listeners (timeupdate, play, pause, ended) ──
  useEffect(() => {
    if (!current?.playbackSrc) return;
    const el = current.isVideo ? videoRef.current : audioRef.current;
    if (!el) return;

    const store = useMiniPlayerStore.getState();

    const onTime = () => store.setTime(el.currentTime, el.duration || 0);
    const onPlay = () => store.setPlaying(true);
    const onPause = () => store.setPlaying(false);

    const onEnded = () => {
      // If MediaPlayer has an override, use it (handles sleep, advanced shuffle, etc.)
      if (onTrackEndRef.current) { onTrackEndRef.current(); return; }

      // Default advance logic (used by MiniPlayer)
      const s = useMiniPlayerStore.getState();
      if (s.loopMode === 'one') { el.currentTime = 0; el.play().catch(() => {}); return; }

      let next: number;
      if (s.shuffle) {
        const rest = Array.from({ length: s.queue.length }, (_, i) => i).filter(i => i !== s.currentIndex);
        next = rest.length > 0 ? rest[Math.floor(Math.random() * rest.length)] : 0;
      } else {
        next = s.currentIndex + 1;
      }
      if (s.loopMode === 'all' && next >= s.queue.length) next = 0;
      if (next < s.queue.length) { s.setCurrentIndex(next); s.setPlaying(true); }
      else s.setPlaying(false);
    };

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
    };
  }, [trackKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on deactivate ──
  useEffect(() => {
    if (!active) {
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = ''; }
      prevTrackKeyRef.current = '';
    }
  }, [active]);

  return (
    <>
      <audio ref={audioRef} preload="auto" className="hidden" />
      <video ref={videoRef} preload="auto" className="hidden w-full max-h-[360px] rounded-md [color-scheme:dark]" />
    </>
  );
}
