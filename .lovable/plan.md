
# Enrich Video Tools, Generators, and Remaining Gaps

## Overview

Apply the same "preview before you commit" philosophy from audio tools to video tools and generators. Also fix several items missed in previous passes.

## 1. Video Preview Player (biggest gap)

None of the 7 video tools show a `<video>` preview of the input file or the processed output. Users drop a video and see only a filename -- they can't verify it's the right file or preview the result.

### New Component: `VideoPlayer.tsx`

A minimal video player component, mirroring `AudioPlayer.tsx`:
- Native `<video controls>` element with `preload="metadata"`
- `URL.createObjectURL` / `revokeObjectURL` lifecycle
- Props: `src: File | Blob`, `label?: string`, `className?: string`
- Max height constrained (e.g. `max-h-[360px]`) so it doesn't overwhelm the page
- `[color-scheme:dark]` for dark mode consistency

### Integration

| Tool | Input preview | Output preview |
|------|--------------|----------------|
| Video Trimmer | Yes -- lets users see timestamps to know where to cut | Yes |
| Video Compressor | Yes | Yes -- compare quality visually |
| Video Converter | Yes | Yes |
| Video Mute | Yes -- verify it's the right video | Yes |
| Video to GIF | Yes | Yes -- show the GIF inline (`<img>`) |
| Video to MP3 | Yes -- verify video before extracting audio | No (audio output, already has AudioPlayer) |
| Video to Audio | Yes | No (audio output, already has AudioPlayer) |

### VideoToGif special case
Output is a GIF, not a video. Show it with an `<img>` tag instead of `<video>`, using the same object URL pattern.

## 2. Video Trimmer -- Use Video Player for Timestamp Selection

The Video Trimmer currently has blind number inputs. With the `<video>` player added:
- The native video controls show the current playback time
- Add a "Set Start to Current Time" / "Set End to Current Time" button pair
- Users play the video, pause at the desired point, click "Set Start", then seek forward, click "Set End"
- This mirrors the interactive waveform approach from the Audio Trimmer but using native video controls

## 3. Generator Tool Enhancements

### Tone Generator
- **Bug fix**: Lines 66-70 update the oscillator directly during render (side effect outside useEffect). Move to a `useEffect` that watches `frequency`, `waveform`, `amplitude`.
- **Live parameter update**: The noise generator can't update while playing (buffer-based). Add a note: "Stop and restart to apply changes" -- or regenerate the buffer on param change.

### Noise Generator  
- **Live update gap**: Changing noise type or level while playing does nothing because the buffer is pre-generated. Two options:
  - Option A: Stop and restart automatically when params change while playing
  - Option B: Show a subtle "Restart to apply" hint
- Recommend Option A (auto-restart) for seamless UX.

### Sweep Generator
- **Double-wrapping bug**: Line 60 does `new Blob([wavData], { type: 'audio/wav' })` but `encodeWav()` already returns a `Blob`. This creates a Blob containing a Blob, which could cause download issues. Fix: use `encodeWav()` result directly.

## 4. Missed Standardization Items

### Unstyled "Analyze another file" buttons still remaining

Two tools were missed in the previous standardization pass:
- **FreqResponse.tsx** (line 53): Still uses raw `<button>` with inline styles
- **WaveformImage.tsx** (line 125): Still uses raw `<button>` with inline styles

Both need to be updated to the styled `<Button variant="outline" size="sm">` pattern.

## 5. VideoConverter -- Size Comparison in Output

`VideoConverter` output card (line 75) shows file size but no comparison to input. Add the same "X% smaller/larger" pattern used by VideoCompressor and other tools.

---

## Technical Details

### VideoPlayer component

```text
Props:
  src: File | Blob
  label?: string
  className?: string

Implementation:
- useEffect with URL.createObjectURL / revokeObjectURL (identical pattern to AudioPlayer)
- <video controls preload="metadata" className="w-full max-h-[360px] rounded-md">
- [color-scheme:dark] for dark mode
- Optional label as small text above
```

### Video Trimmer timestamp buttons

```text
Two new buttons below the video player:
  "Set Start" -- reads video.currentTime, sets startTime state
  "Set End" -- reads video.currentTime, sets endTime state

Requires a ref to the <video> element (exposed via VideoPlayer or a callback ref)
```

### Noise Generator auto-restart

```text
useEffect watching [noiseType, amplitude, playing]:
  if (playing) { stopPlayback(); startPlayback(); }
```

### Tone Generator side-effect fix

```text
Move oscillator param updates from render body into:
useEffect(() => {
  if (oscRef.current && playing) {
    oscRef.current.frequency.value = frequency;
    oscRef.current.type = waveform;
    if (gainRef.current) gainRef.current.gain.value = amplitude;
  }
}, [frequency, waveform, amplitude, playing]);
```

### Files to create
- `src/components/shared/VideoPlayer.tsx`

### Files to modify
| File | Change |
|------|--------|
| VideoTrimmer.tsx | Add VideoPlayer + "Set Start/End" buttons |
| VideoCompressor.tsx | Add VideoPlayer input + output preview |
| VideoConverter.tsx | Add VideoPlayer input + output preview + size comparison |
| VideoMute.tsx | Add VideoPlayer input + output preview |
| VideoToGif.tsx | Add VideoPlayer input + `<img>` output preview |
| VideoToMp3.tsx | Add VideoPlayer input preview |
| VideoToAudio.tsx | Add VideoPlayer input preview |
| ToneGenerator.tsx | Fix render side-effect, move to useEffect |
| NoiseGenerator.tsx | Auto-restart on param change while playing |
| SweepGenerator.tsx | Fix double-Blob wrapping |
| FreqResponse.tsx | Standardize "Analyze another file" button |
| WaveformImage.tsx | Standardize "Choose different file" button |

### Implementation order
1. Create `VideoPlayer.tsx` component
2. Integrate into all 7 video tools (input + output previews)
3. Add "Set Start/End to Current Time" to VideoTrimmer
4. Add GIF preview to VideoToGif output
5. Fix ToneGenerator render side-effect
6. Fix NoiseGenerator live-update gap
7. Fix SweepGenerator double-Blob bug
8. Fix remaining unstyled buttons (FreqResponse, WaveformImage)
9. Add size comparison to VideoConverter output
