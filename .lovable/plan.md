
# Fix: Visualizations Not Full-Width + Spectrum Runs Forever

## Problem 1: Waveform & Spectrum Not Filling Full Width

The `WaveformSeekbar` initializes `canvasWidth` to 600px and only updates it via `ResizeObserver`. On first render, it draws at 600px before the observer fires. Similarly, `LiveSpectrum` starts with `sizeRef.current.w = 0` and waits for ResizeObserver -- meaning the first few frames may render incorrectly or not at all.

**Fix**: Initialize canvas width from the container's actual `clientWidth` on mount, so the very first frame is full-width.

### Files:
- **`src/components/shared/WaveformSeekbar.tsx`**: Initialize `canvasWidth` state from `containerRef.current.clientWidth` inside the ResizeObserver setup, so the first render uses the real width instead of 600.
- **`src/components/shared/LiveSpectrum.tsx`**: Initialize `sizeRef.current.w` from `canvas.clientWidth` in the ResizeObserver setup effect.
- **`src/components/shared/LiveSpectrogram.tsx`**: Same fix -- initialize `actualWidthRef.current` from container's `clientWidth`.

---

## Problem 2: Spectrum Animation Runs When Audio Is Paused/Stopped

The `LiveSpectrum` and `LiveSpectrogram` both run a `requestAnimationFrame` loop unconditionally once mounted. Even when audio is paused, the loop keeps running (drawing near-zero bars), wasting CPU.

**Fix**: Pass the `audioElement` (or a `paused` flag) to the spectrum components. Inside the rAF loop, check if audio is paused -- if so, skip drawing and stop the loop. Re-start the loop when audio resumes via `play`/`pause` event listeners.

### Changes:
- **`src/components/shared/LiveSpectrum.tsx`**: Add an optional `audioElement` prop. Listen for `play`/`pause` events on it. Only run the rAF loop while audio is playing.
- **`src/components/shared/LiveSpectrogram.tsx`**: Same approach -- add `audioElement` prop, pause the rAF loop when audio is not playing.
- **`src/pages/tools/MediaPlayer.tsx`**: Pass `audioRef.current` to `LiveSpectrum` and `LiveSpectrogram` as `audioElement`.

---

## Technical Details

### WaveformSeekbar width init (example):
```typescript
// In the ResizeObserver effect:
useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  // Set initial width immediately
  const initialW = el.clientWidth;
  if (initialW > 0) setCanvasWidth(Math.floor(initialW));
  // Then observe for future changes
  const obs = new ResizeObserver(...);
  ...
}, []);
```

### LiveSpectrum pause-aware loop (example):
```typescript
interface LiveSpectrumProps {
  analyserNode: AnalyserNode | null;
  audioElement?: HTMLAudioElement | null; // new
  ...
}

// Inside the draw effect:
useEffect(() => {
  ...
  const el = audioElement;
  function startLoop() { if (!rafRef.current) draw(); }
  function stopLoop() { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }

  if (el) {
    el.addEventListener('play', startLoop);
    el.addEventListener('pause', stopLoop);
    if (!el.paused) startLoop();
  } else {
    startLoop(); // fallback: always run if no element provided
  }

  return () => {
    stopLoop();
    el?.removeEventListener('play', startLoop);
    el?.removeEventListener('pause', stopLoop);
  };
}, [analyserNode, audioElement, ...]);
```

### MediaPlayer.tsx usage:
```tsx
<LiveSpectrum analyserNode={analyserNode} audioElement={audioRef.current} height={48} barCount={64} />
<LiveSpectrogram analyserNode={analyserNode} audioElement={audioRef.current} height={80} />
```
