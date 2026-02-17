

# Add Audio Player Across All Tools

## Overview

Create a reusable `AudioPlayer` component and integrate it everywhere users work with audio -- both input files they drop in and output files they produce. Uses the native HTML `<audio>` element for maximum compatibility and simplicity.

## New Component

### `src/components/shared/AudioPlayer.tsx`

A minimal, styled audio player that accepts either a `File` or a `Blob`:

- Native `<audio>` element with `controls` attribute (play/pause, scrub, volume, time display -- all handled by the browser)
- Creates an object URL from the File/Blob via `URL.createObjectURL`, revokes it on cleanup
- Compact design that fits inline with `FileInfoBar` and `DownloadButton`
- Accepts an optional `label` prop (e.g. "Input" / "Output")

```text
Props:
  - src: File | Blob
  - label?: string (e.g. "Preview", "Output")
  - className?: string
```

## Integration Points

### Input side (audio file dropped by user)

Add the player right below `FileInfoBar` on these audio-input tools:

| Tool | File |
|------|------|
| Audio Converter | `AudioConverter.tsx` |
| Audio Trimmer | `AudioTrimmer.tsx` |
| Audio Normalizer | `AudioNormalizer.tsx` |
| Sample Rate Converter | `SampleRateConverter.tsx` |
| Channel Ops | `ChannelOps.tsx` |
| Metadata Stripper | `MetadataStripper.tsx` |
| Tag Editor | `TagEditor.tsx` |
| Waveform Viewer | `WaveformViewer.tsx` |
| Waveform Image | `WaveformImage.tsx` |
| Spectrogram Viewer | `SpectrogramViewer.tsx` |
| Spectrum Analyzer | `SpectrumAnalyzer.tsx` |
| Hi-Res Verifier | `HiResVerifier.tsx` |
| Lossy Detector | `LossyDetector.tsx` |
| LUFS Meter | `LufsMeter.tsx` |
| Dynamic Range Meter | `DynamicRangeMeter.tsx` |
| Stereo Analyzer | `StereoAnalyzer.tsx` |
| File Inspector | `FileInspector.tsx` |
| Audio Comparator | `AudioComparator.tsx` |
| Batch Analyzer | `BatchAnalyzer.tsx` |

Pattern: `<AudioPlayer src={file} label="Input" />` right after the `FileInfoBar`.

### Output side (processed audio result)

Add the player inside the output/download section on tools that produce audio output blobs:

| Tool | File |
|------|------|
| Audio Converter | `AudioConverter.tsx` |
| Audio Trimmer | `AudioTrimmer.tsx` |
| Audio Normalizer | `AudioNormalizer.tsx` |
| Sample Rate Converter | `SampleRateConverter.tsx` |
| Channel Ops | `ChannelOps.tsx` |
| Metadata Stripper | `MetadataStripper.tsx` |
| Video to MP3 | `VideoToMp3.tsx` |
| Video to Audio | `VideoToAudio.tsx` |

Pattern: `<AudioPlayer src={outputBlob} label="Output" />` alongside the `DownloadButton`.

### Tools that are skipped (video output or no file input)

These tools produce video output or have no audio file -- no player needed:

- Video Compressor, Video Converter, Video Trimmer, Video Mute, Video to GIF
- Tone Generator, Noise Generator, Sweep Generator (already have their own oscillator-based playback)
- DAC Test, Hearing Test (realtime oscillator playback)
- Bitrate Calculator, Format Reference, Bluetooth Codecs (reference tools, no files)

## Technical Details

### Component implementation

```tsx
// AudioPlayer.tsx
- useEffect with URL.createObjectURL / URL.revokeObjectURL lifecycle
- Native <audio controls> element -- no custom UI needed
- Styled with rounded border, bg-card to match existing card style
- preload="metadata" for instant duration display without loading full file
```

### Memory management

- Object URLs are created on mount/prop change and revoked on cleanup
- Uses `useEffect` dependency on `src` to handle file changes correctly

### Styling

- Matches the existing card/border pattern used by `FileInfoBar` and output result sections
- `<audio>` element set to `w-full` so it stretches to fill its container
- Optional label displayed as small text above the player

