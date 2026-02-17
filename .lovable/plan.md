

# Full Website Audit: TrueRes.io

## 1. Console Errors (Active Bugs)

### 1.1 React ref warnings on MediaPlayer page
- **ToolActionGrid** and **LiveSpectrum** are function components receiving refs without `React.forwardRef()`. MediaPlayer passes refs to these components, triggering React warnings.
- **Fix**: ToolActionGrid does not need a ref (remove the ref passing in MediaPlayer). LiveSpectrum also does not use `forwardRef` -- the ref warning comes from how MediaPlayer renders it.

### 1.2 Memory leak in MetadataDisplay
- `coverUrl` is referenced in the cleanup function of the effect that sets it, but it captures the stale closure value (always `null` on first render). Cover art object URLs may leak.
- **Fix**: Use a ref or revoke inside the same effect scope.

---

## 2. Functional Bugs

### 2.1 AudioPlayer creates new AudioContext on every src change
- The Web Audio graph initialization effect depends on `[url]`, which changes on every track switch. However, the guard `if (ctxRef.current) return` prevents re-creation. The issue is that `MediaElementAudioSourceNode` is bound to one `<audio>` element forever -- if the element stays the same but `src` changes, it works. But if the element remounts, the old context is orphaned (never closed) because `ctxRef.current` is set but the element is new.
- **Fix**: Add cleanup to close the AudioContext and reset refs when the component unmounts.

### 2.2 WaveformSeekbar creates a new AudioContext per track
- Each time `audioElement.src` changes, a new `AudioContext` is created to decode the audio. These contexts are closed in `.then()` but not in error paths for all browsers. Also, creating an AudioContext for every track to decode peaks is expensive.
- **Impact**: Minor -- contexts are closed after decode.

### 2.3 Crossfade logic has race conditions
- The crossfade effect depends only on `[crossfadeSec]`, so it captures a stale `audioRef.current`. When switching tracks, the effect does not re-bind to the new audio element.
- **Fix**: Add `currentIndex` or the audio element to the dependency array.

### 2.4 Sleep timer can fire after unmount
- The `setInterval` in the sleep timer effect can call `setSleepMode(0)` after the component unmounts if navigation happens during countdown.
- **Fix**: Already has cleanup, but the `setSleepMode(0)` call inside the interval callback can still fire between the last interval tick and cleanup.

### 2.5 MiniPlayer does not sync with main player
- When activating the mini-player, the queue is copied into the Zustand store, but subsequent queue changes in MediaPlayer are not reflected. The mini-player and main player can get out of sync.

### 2.6 Pre-buffer creates/revokes object URLs on every render cycle
- The pre-buffer effect for gapless playback runs on `[currentIndex, queue, getNextIndex]`. Since `queue` is a new array reference on every state update, this effect fires excessively, creating and revoking object URLs repeatedly.
- **Fix**: Use a stable reference or memoize.

---

## 3. Performance Issues

### 3.1 MediaPlayer component is 700 lines with 15+ useState hooks
- This monolithic component is difficult to maintain and causes excessive re-renders since every state change re-renders the entire tree.
- **Recommendation**: Extract into custom hooks (`usePlaybackControls`, `useSleepTimer`, `useCrossfade`, `usePlaylist`) and sub-components.

### 3.2 WaveformSeekbar uses requestAnimationFrame polling for time
- Continuously runs `requestAnimationFrame` even when audio is paused, consuming CPU.
- **Fix**: Only run rAF when audio is playing.

### 3.3 LiveSpectrum/LiveSpectrogram run rAF continuously
- Both visualizations run `requestAnimationFrame` loops even when audio is paused or the tab is in the background.
- **Fix**: Pause animation when audio is paused.

### 3.4 LiveSpectrum re-reads CSS variables and resizes canvas every frame
- `canvas.width = rect.width * dpr` on every frame triggers layout thrashing.
- **Fix**: Only resize on container resize (use ResizeObserver like LiveSpectrogram does).

---

## 4. SEO Issues

### 4.1 Sitemap missing `/media-player`
- The media-player route is not in `sitemap.xml`.
- **Fix**: Add `<url><loc>https://trueres.io/media-player</loc>...</url>`.

### 4.2 Homepage hardcodes "35 tools" but there are 36 (media-player added)
- Count TOOLS array: 12 analysis + 8 processing + 7 video + 5 generators + 4 reference = 36.
- **Fix**: Update hero text or make it dynamic.

### 4.3 NotFound page uses `min-h-screen` with `bg-muted` outside AppShell styling
- The 404 page has its own background that conflicts with the app shell.
- **Fix**: Use consistent styling.

---

## 5. Accessibility Issues

### 5.1 No aria-labels on transport control icon-only buttons
- Shuffle, skip, loop, spectrum toggle, spectrogram toggle, crossfade, sleep timer, minimize buttons in MediaPlayer only have `title` attributes. Screen readers need `aria-label`.
- **Fix**: Add `aria-label` to all icon-only buttons.

### 5.2 Crossfade and Sleep popover menus lack keyboard support
- The popover menus for crossfade slider and sleep timer options don't trap focus or close on Escape.
- **Fix**: Use Popover component from Radix or add keyboard handlers.

### 5.3 PlaylistPanel drag-and-drop is not keyboard accessible
- Reordering tracks requires mouse drag. No keyboard alternative.
- **Fix**: Add move up/down buttons or keyboard drag support.

### 5.4 Canvas visualizations have no text alternatives
- WaveformSeekbar, LiveSpectrum, and LiveSpectrogram canvases have no `aria-label` or description.
- **Fix**: Add `role="img"` and `aria-label`.

---

## 6. UX Issues

### 6.1 Popover menus (crossfade, sleep, speed) don't close on outside click
- These are custom `div` elements positioned with absolute, not using Radix Popover. They only close by re-clicking the toggle button.
- **Fix**: Add click-outside detection or use Radix Popover.

### 6.2 No visual feedback for keyboard shortcuts
- Space, N, P shortcuts work but there's no toast or visual confirmation when used.

### 6.3 Export .m3u and Add Files buttons lack visual hierarchy
- Both buttons look identical and are small. The "Add files" button is misleadingly labeled (it's just a file picker, not an .m3u importer).

---

## 7. Code Quality

### 7.1 Global mutable `nextId` counter
- `let nextId = 0` at module scope will reset on hot reload but persist across component mounts, which is fine in production but fragile.

### 7.2 `useFFmpegStore` import in ToolPage but no corresponding export
- ToolPage imports from `@/stores/ffmpeg-store` which exists and works, but `reset` is called on every tool switch, which is redundant if FFmpeg wasn't loaded.

### 7.3 Duplicate `formatTime` function
- Defined in WaveformSeekbar, ABLoopControls, MiniPlayer, and MediaPlayer. Should be extracted to a shared utility.

---

## Implementation Plan (Priority Order)

### Phase 1: Bug Fixes (Critical)
1. Fix ref warnings: Remove ref passing to ToolActionGrid and LiveSpectrum in MediaPlayer
2. Fix MetadataDisplay cover art URL memory leak
3. Fix crossfade stale closure by adding proper dependencies
4. Add AudioContext cleanup on AudioPlayer unmount
5. Add `/media-player` to sitemap.xml
6. Update tool count from "35" to dynamic count

### Phase 2: Performance
7. Add pause detection to rAF loops in WaveformSeekbar, LiveSpectrum, LiveSpectrogram
8. Fix LiveSpectrum canvas resize (use ResizeObserver)
9. Stabilize pre-buffer effect dependencies

### Phase 3: Accessibility
10. Add aria-labels to all icon-only buttons in MediaPlayer
11. Add role="img" and aria-labels to canvas visualizations
12. Replace custom popover divs with Radix Popover for crossfade/sleep/speed menus
13. Fix NotFound page styling consistency

### Phase 4: Code Quality
14. Extract shared `formatTime` utility
15. Consider refactoring MediaPlayer into smaller hooks/components (optional, larger effort)

### Technical Details

**Files to modify:**
- `src/pages/tools/MediaPlayer.tsx` -- ref fixes, aria-labels, dependency fixes
- `src/components/shared/AudioPlayer.tsx` -- AudioContext cleanup
- `src/components/shared/MetadataDisplay.tsx` -- cover URL leak fix
- `src/components/shared/WaveformSeekbar.tsx` -- pause detection, aria-label
- `src/components/shared/LiveSpectrum.tsx` -- ResizeObserver, pause detection, aria-label
- `src/components/shared/LiveSpectrogram.tsx` -- pause detection, aria-label
- `src/components/shared/ABLoopControls.tsx` -- extract formatTime
- `src/components/shared/MiniPlayer.tsx` -- extract formatTime
- `src/pages/Index.tsx` -- dynamic tool count
- `src/pages/NotFound.tsx` -- consistent styling
- `public/sitemap.xml` -- add media-player
- `src/lib/utils.ts` -- add shared formatTime

