

# Audio Amplification with Preview

## Overview

Add an optional gain/amplification control to audio processing tools. Users can adjust gain from -12 dB to +12 dB, preview the amplified audio in real-time (via Web Audio API), and have the gain baked into the final processed output (via FFmpeg `-af volume` filter).

## Approach

### 1. New reusable component: `GainControl`

A compact UI block with:
- A slider from -12 dB to +12 dB (default 0 = no change)
- A "Preview" play/stop button that plays the audio with the selected gain applied in real-time using `useAudioPreview.playWithGain()`
- dB readout label

This component is self-contained and can be dropped into any tool page that accepts audio input.

### 2. FFmpeg gain injection

A small helper function `injectGainFilter(args, gainDb)` in `presets.ts` that:
- If `gainDb === 0`, returns args unchanged
- If args already contain `-af`, appends `,volume=XdB` to the existing filter
- Otherwise inserts `-af volume=XdB` before the output filename

This avoids modifying every individual preset function.

### 3. Tool pages that get the GainControl

Tools where amplification is useful (audio processing/conversion):

| Tool | Why |
|------|-----|
| Audio Converter | Boost/cut during format conversion |
| Audio Trimmer | Adjust volume of trimmed clip |
| Sample Rate Converter | Adjust volume during resampling |
| Channel Ops | Adjust volume during channel changes |
| Metadata Stripper | Adjust volume while stripping |
| Audio to Video | Boost audio in the output video |

**Excluded**: Audio Normalizer (already has its own loudness targeting with preview), analysis-only tools (Spectrum, Spectrogram, LUFS Meter, etc.), video-only tools.

## File Changes

### New file: `src/components/shared/GainControl.tsx`

A compact component that accepts a `file: File`, `gainDb: number`, and `onGainChange: (db: number) => void`. Internally uses `useAudioPreview` to decode the file and provide a preview play button with the selected gain.

```text
Layout:
  Gain  [-12 ====|========= +12]  +3.0 dB   [Preview]
```

### Modified: `src/engines/processing/presets.ts`

Add utility function:

```text
injectGainFilter(args: string[], gainDb: number): string[]
  - Returns args unchanged if gainDb is 0
  - If args contain an existing -af flag, appends ",volume={gainDb}dB" to its value
  - Otherwise inserts ["-af", "volume={gainDb}dB"] before the last arg (output filename)
```

### Modified tool pages (6 files)

Each page gets:
- `useState` for `gainDb` (default 0)
- `<GainControl>` component rendered after the AudioPlayer
- `injectGainFilter(args, gainDb)` wrapping the ffmpeg args before processing

Pages:
- `src/pages/tools/AudioConverter.tsx`
- `src/pages/tools/AudioTrimmer.tsx`
- `src/pages/tools/SampleRateConverter.tsx`
- `src/pages/tools/ChannelOps.tsx`
- `src/pages/tools/MetadataStripper.tsx`
- `src/pages/tools/AudioToVideo.tsx`

The pattern for each page is identical -- add ~5 lines of code:
1. Import `GainControl` and `injectGainFilter`
2. Add `const [gainDb, setGainDb] = useState(0);`
3. Render `<GainControl file={file} gainDb={gainDb} onGainChange={setGainDb} />` after AudioPlayer
4. Wrap ffmpeg args: `injectGainFilter(args, gainDb)`

## Technical Notes

- **Preview uses Web Audio API** (real-time, no processing delay) via `useAudioPreview.playWithGain()` which applies gain through a `GainNode`
- **Output uses FFmpeg** `-af volume=XdB` filter which permanently bakes the gain into the file
- **No new dependencies** required
- The `injectGainFilter` helper is smart about merging with existing `-af` filters (e.g., Audio Trimmer or Channel Ops already use `-af` for some operations)
- Batch mode: gain applies uniformly to all files in the batch (same setting for all)

