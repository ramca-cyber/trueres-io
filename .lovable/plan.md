
# Fix: Playback Interruption on Navigation + Waveform Not Full-Width

## Issue 1: Playback stops / restarts from beginning when navigating away

**Root cause**: The MediaPlayer and MiniPlayer each create their own separate `<audio>` element. When you leave `/media-player`, the MediaPlayer's audio element is destroyed. The MiniPlayer creates a new one and loads the blob -- but it never seeks to the stored `currentTime`. It just starts from 0.

**Fix**: In `MiniPlayer.tsx`, after the new media element loads its source, seek it to `store.currentTime` before playing. Add a `loadeddata` listener that sets `el.currentTime = store.currentTime` on the first load.

### File: `src/components/shared/MiniPlayer.tsx`
- In the effect that reacts to `isPlaying` and `url` changes (lines 45-50), add logic to seek to the store's `currentTime` before calling `play()`.
- Specifically: listen for `loadeddata` on the element, then set `el.currentTime = store.getState().currentTime` once, then play if `isPlaying` is true.
- Also ensure `store.setPlaying(true)` is called in the MediaPlayer's `handleMinimize` so the MiniPlayer knows to auto-play.

---

## Issue 2: Waveform not using full width

**Root cause**: `WaveformSeekbar` has an early return on line 187: `if (!audioElement) return null`. This means the container `<div ref={containerRef}>` is never rendered on the first pass. The ResizeObserver effect (lines 34-45) runs with `[]` deps, finds `containerRef.current === null`, and exits. When `audioElement` later becomes available and the component re-renders with the container div, the effect does NOT re-run because its dependency array is empty. So `canvasWidth` stays at the default `600`.

**Fix**: Add `audioElement` (or a boolean derived from it) to the ResizeObserver effect's dependency array so it re-runs when the component transitions from returning `null` to rendering the actual container.

### File: `src/components/shared/WaveformSeekbar.tsx`
- Change the ResizeObserver effect deps from `[]` to include a trigger that fires when the container first renders. The simplest approach: use a state or check -- add a dependency that changes when `audioElement` goes from null to non-null. For example, change deps to `[!!audioElement]` so the effect re-runs when audioElement becomes available and the container div actually mounts.

---

## Technical Summary

| File | Change |
|------|--------|
| `src/components/shared/MiniPlayer.tsx` | Seek to `store.currentTime` when loading a new source, before playing |
| `src/components/shared/WaveformSeekbar.tsx` | Add `!!audioElement` to ResizeObserver effect deps so it runs after the container actually mounts |
