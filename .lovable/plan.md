

# Refinements Across the Audio Toolkit

## 1. Retry button on all FFmpeg tools (not just AudioConverter)

Currently, only `AudioConverter.tsx` has a Retry button when the FFmpeg engine fails to load. All other FFmpeg-based tools (Trimmer, Normalizer, SampleRateConverter, ChannelOps, MetadataStripper, VideoToMp3, VideoToAudio, VideoTrimmer, VideoCompressor, VideoConverter, VideoMute, VideoToGif) show a plain error message with no way to retry. Add the same retry pattern everywhere.

## 2. Loading engine progress bar on all FFmpeg tools

`AudioConverter.tsx` shows an indeterminate progress bar with "Downloading ~30 MB (first time only)" while the engine loads. The other FFmpeg tools show nothing during loading -- the button just says "Loading engine..." with a spinner. Add the same `{loading && <ProgressBar value={-1} ... />}` pattern to all FFmpeg tools.

## 3. "Analyze another file" button consistency

Analysis tools like `HiResVerifier`, `WaveformViewer`, `SpectrogramViewer` use a plain unstyled `<button>` or `useAudioStore.getState().clear()` call. Processing tools use a styled `<Button variant="outline">Choose different file</Button>`. Standardize all analysis tools to use the same styled Button component for resetting.

## 4. File size display on AudioPlayer output

When a processing tool produces output, show the output file size next to the download button. Users want to know how big the converted/trimmed file is compared to the input. Add a small `formatFileSize(outputBlob.size)` label in the output card.

## 5. Keyboard shortcuts for the InteractiveWaveform

The trimmer's waveform currently only supports mouse/touch. Add keyboard support:
- **Space** to toggle play/stop preview
- **Left/Right arrows** to nudge the selected handle by 0.1s
- These are standard DAW-like shortcuts users expect

## 6. Cover art memory leak in TagEditor

`TagEditor.tsx` line 53 calls `URL.createObjectURL(metadata.coverArt)` directly in the render without ever revoking it. Every re-render creates a new object URL that leaks. Wrap it in a `useMemo` or `useEffect` with cleanup.

## 7. AudioPlayer dark mode styling

The native `<audio>` element renders with the browser's default theme, which can look jarring against the dark UI. Add `[color-scheme:dark]` CSS to the audio element so browsers render dark controls.

## 8. Normalizer preview button UX fix

The normalizer's "Original" and "Preview -14 LUFS" buttons both call `stop()` when clicked while playing, regardless of which mode is playing. If you're playing "Original" and click "Preview -14 LUFS", it stops instead of switching. Fix to only stop when clicking the same mode that's currently playing, otherwise switch directly.

## 9. Drag cursor feedback on InteractiveWaveform

When dragging a handle, the cursor stays as `crosshair`. Change it to `ew-resize` (horizontal resize) when hovering over a handle or while dragging, giving clear visual feedback.

## 10. Output file size comparison

In the output result card, show a comparison like "Output: 2.3 MB (68% smaller)" to give users immediate feedback on compression/conversion effectiveness. Particularly useful for AudioConverter, VideoCompressor, and MetadataStripper.

---

## Technical Details

### Files modified

| File | Changes |
|------|---------|
| `AudioPlayer.tsx` | Add `[color-scheme:dark]` class to `<audio>` element |
| `InteractiveWaveform.tsx` | Add keyboard event handlers, cursor state for drag feedback |
| `AudioNormalizer.tsx` | Fix preview toggle logic to switch modes instead of stopping |
| `TagEditor.tsx` | Fix cover art object URL memory leak |
| `AudioTrimmer.tsx` | Add Space key for play/stop |
| All FFmpeg tools (12 files) | Add loading progress bar + retry button pattern |
| All analysis tools (7 files) | Standardize "analyze another" to styled Button |
| All FFmpeg output cards (8 files) | Add output file size display with comparison |

### Implementation order

1. `AudioPlayer.tsx` -- dark mode fix (quick, affects all tools)
2. `InteractiveWaveform.tsx` -- keyboard shortcuts + cursor feedback
3. `AudioNormalizer.tsx` -- preview toggle fix
4. `TagEditor.tsx` -- memory leak fix
5. FFmpeg loading/retry pattern across all tools
6. Analysis tool button consistency
7. Output file size comparison across processing tools

