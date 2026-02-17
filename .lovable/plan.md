
# TrueRes.io Full Website Audit

## Audit Summary

After reviewing all 35 tool pages, shared components, engine modules, state management, and routing, here are the findings organized by severity.

---

## Critical Issues (Bugs)

### 1. Shared AudioStore causes cross-tool data contamination
All analysis-based tools (12 tools) share a single global `useAudioStore` Zustand store. When a user navigates from one tool to another without refreshing, the previous tool's file, PCM data, and analysis cache persist. This means:
- Opening Hi-Res Verifier, analyzing a file, then navigating to LUFS Meter will show the old file's data instead of a fresh drop zone
- The "Analyze another file" button on Hi-Res Verifier and LUFS Meter calls `window.location.reload()` instead of `store.clear()` -- a poor UX workaround

**Fix**: Clear the audio store on tool page mount (add `useEffect(() => store.clear(), [])` to each analysis tool or inside the `ToolPage` wrapper when the tool ID changes).

### 2. Shared FFmpegStore causes cross-tool state bleed
Same issue for processing tools (13 tools). The `useFFmpegStore` is a singleton. If a user converts audio, navigates to Video Trimmer, the old `outputBlob` and `progress` may still be visible.

**Fix**: Call `reset()` on `useFFmpegStore` when the tool component mounts or when `ToolPage` tool ID changes.

### 3. AudioConverter passes duplicate `inputName`
In `AudioConverter.tsx`, `inputName` is constructed locally, then passed to `process()` which constructs its own `inputName` again inside `useFFmpeg.process()`. The `args` array references the local `inputName`, but `processFile` writes the file with the hook's `inputName`. These could mismatch if naming logic diverges. The same pattern exists in `AudioTrimmer`, `AudioNormalizer`, `MetadataStripper`, `SampleRateConverter`, `ChannelOps`, and all video tools.

**Fix**: Standardize -- either let the hook handle naming (and accept a function that generates args from the final name), or remove the duplicate naming from the hook.

### 4. TagEditor is read-only despite being called "Editor"
The Tag Editor only displays tags, with a note saying "Full editing support is coming soon." This is misleading to users expecting editing functionality.

**Fix**: Either rename to "Tag Viewer" or implement basic tag editing via ffmpeg metadata writing.

---

## Moderate Issues (Functional Gaps)

### 5. No "reset/new file" button on most analysis tools
Only Hi-Res Verifier and LUFS Meter have a "reset" link (via `window.location.reload()`). The other 10 analysis tools (Spectrogram, DR Meter, Waveform, Stereo Analyzer, File Inspector, Lossy Detector, Spectrum, Comparator, Batch, Freq Response) have no way to analyze a different file without manually navigating away and back.

**Fix**: Add a consistent "Analyze another file" button to all analysis tools that calls `store.clear()`.

### 6. Batch Analyzer `onFileSelect` is a no-op
In `BatchAnalyzer.tsx` line 81, `onFileSelect={() => {}}` is passed as a required prop but does nothing. This works because `onMultipleFiles` handles the actual logic, but if a user drops a single file, nothing happens silently.

**Fix**: Handle single-file drops in `onFileSelect` too (wrap it in an array and pass to `handleFiles`).

### 7. FFmpeg processing tools share a singleton FFmpeg instance but no concurrency guard
If a user starts converting in Audio Converter, navigates to Video Compressor, and starts another process, both will attempt to use the same FFmpeg instance simultaneously, likely corrupting the virtual filesystem.

**Fix**: Add a global processing lock or disable processing buttons when another FFmpeg operation is in progress.

### 8. Missing OGG metadata parsing
The `useAudioFile` hook only parses metadata for MP3 (ID3) and FLAC (Vorbis Comments). OGG files also contain Vorbis Comments but are not parsed, so Tag Editor and File Inspector show no metadata for OGG files.

**Fix**: Add OGG Vorbis Comment extraction in the `useAudioFile` hook.

### 9. WaveformImage canvas not responsive
The canvas has a fixed `width`/`height` set programmatically. On mobile, the rendered image may not match the visible canvas area.

**Fix**: Use the container width for default dimensions or match canvas to container on resize.

---

## Minor Issues (UX Polish)

### 10. `SpectrumCanvas` prop `showOctaveBands` unused in FreqResponse
The `FreqResponse` tool passes `showOctaveBands={false}` but `SpectrumCanvas` still tries to render them if data has `octaveBands`. This works correctly but is redundant.

### 11. No loading skeleton for lazy-loaded tool pages
The Suspense fallback is a simple spinner. Tool pages should show a skeleton matching the ToolPage layout for less jarring transitions.

### 12. Console warning about `SharedArrayBuffer`
The `BrowserCompatBanner` correctly warns about `SharedArrayBuffer`, but the ffmpeg.wasm UMD build used (0.12.6) actually works without it (single-threaded mode). The warning may alarm users unnecessarily when processing will still work.

**Fix**: Refine the warning to say processing tools may be slower, not unavailable.

### 13. Memory leak in generator tools
`ToneGenerator`, `NoiseGenerator`, `SweepGenerator`, `HearingTest`, and `DacTest` create `AudioContext` instances but only close them on stop. If a user navigates away while playing, the AudioContext is never closed.

**Fix**: Add cleanup in `useEffect` return to stop playback and close AudioContext on unmount.

### 14. No error boundary around tool pages
If an analysis module throws (e.g., malformed file), the entire app crashes. There is no error boundary wrapping tool content.

---

## Implementation Plan

### Phase 1 -- Critical Fixes (store isolation + input naming)
1. Add store reset logic to `ToolPage.tsx` -- when `tool.id` changes, clear both `useAudioStore` and `useFFmpegStore`
2. Fix the input name duplication in `useFFmpeg.process()` -- accept `inputName` as a parameter instead of generating it internally, since all callers already generate one
3. Add a global FFmpeg processing lock to prevent concurrent operations

### Phase 2 -- Reset Buttons + Batch Fix
4. Add a "Choose different file" / "Reset" button to all analysis tool pages
5. Fix `BatchAnalyzer` single-file drop handling
6. Add OGG metadata parsing in `useAudioFile`

### Phase 3 -- Memory + Error Handling
7. Add `useEffect` cleanup to all 5 generator/test tools to close AudioContext on unmount
8. Wrap tool content in an error boundary component
9. Fix `BrowserCompatBanner` warning text for SharedArrayBuffer

### Phase 4 -- UX Polish
10. Rename TagEditor to "Tag Viewer" or add basic ffmpeg-based tag writing
11. Improve lazy-load skeleton
12. Make WaveformImage canvas responsive

---

## Technical Details

### Files to modify:
- `src/components/shared/ToolPage.tsx` -- add store clearing on tool ID change
- `src/hooks/use-ffmpeg.ts` -- accept inputName param, add lock
- `src/pages/tools/*.tsx` -- add reset buttons (10 analysis tools), add useEffect cleanup (5 generator tools)
- `src/pages/tools/BatchAnalyzer.tsx` -- fix single-file handling
- `src/hooks/use-audio-file.ts` -- add OGG metadata parsing
- `src/components/shared/BrowserCompatBanner.tsx` -- refine warning text
- New file: `src/components/shared/ErrorBoundary.tsx`
