
# Media Player: Rethink from the Ground Up

## Overview

Transform the Media Player from a bare-bones "drop and play" page into the **hub of the platform** -- a prominent, rich player that doubles as a launchpad to every compatible tool. The idea: play your file first, then decide what to do with it.

## Current Problems

- The player is buried under `reference` category -- feels like an afterthought
- After playing, the only action is "Choose different file" -- a dead end
- No way to send the current file to another tool (e.g., "analyze this", "convert this")
- The layout is identical to every other tool page -- nothing makes it feel like a player

## New Design

### 1. Prominent Player Layout

Replace the current plain layout with a more immersive, player-focused design:

- **Large player area**: Video gets full width with generous padding; audio gets a waveform-style visual card around it
- **File info integrated into player chrome**: Move `FileInfoBar` details (name, size) directly above the player as a header bar, not a separate component below the drop zone
- **Dark card background** with subtle border to frame the player as the hero element

### 2. "Continue With..." Action Panel

Below the player, show a grid of compatible tools the user can jump to with this same file. This is the key UX innovation.

```text
+------------------------------------------+
|  song.flac  |  24.5 MB                   |
+------------------------------------------+
|                                          |
|        [ Audio / Video Player ]          |
|                                          |
+------------------------------------------+
|  Continue with this file:                |
|                                          |
|  [Spectrogram]  [LUFS Meter]  [Hi-Res]   |
|  [Converter]    [Trimmer]     [DR Meter] |
|  [Waveform]     [Inspector]   [Lossy?]   |
+------------------------------------------+
|  [ Choose different file ]               |
+------------------------------------------+
```

### How tool filtering works

Each tool in the registry has `acceptsFormats`. The loaded file has an extension. Filter tools to only show those whose `acceptsFormats` includes the current file's extension. Exclude:
- The media-player itself
- Tools with no `acceptsFormats` (reference-only tools like Bitrate Calculator, Format Guide)
- Generator tools (they don't accept files)

Group them by category for clarity:
- **Analyze**: Spectrogram, LUFS Meter, DR Meter, Waveform, Stereo, Hi-Res, Lossy Detector, Spectrum, Inspector, Freq Response
- **Process**: Converter, Trimmer, Normalizer, Resample, Channels, Strip Metadata, Waveform Image
- **Video** (only for video files): Trim, Compress, Convert, Mute, to GIF, to MP3, to Audio

### 3. Cross-tool File Passing via URL State

When the user clicks a tool from the action panel, navigate to that tool's route with the file pre-loaded. Since we can't pass `File` objects through URL params, use a lightweight shared store:

- Add a `pendingFile` slot to the existing `audio-store` (or create a minimal `file-transfer-store`)
- When clicking a tool link: store the file in the transfer store, then `navigate(tool.route)`
- On the target tool page: check for a pending file on mount, auto-load it, then clear the store

This is a simple Zustand pattern:

```text
// file-transfer-store.ts
interface FileTransferState {
  pendingFile: File | null;
  setPendingFile: (file: File | null) => void;
  consumePendingFile: () => File | null;  // get and clear
}
```

### 4. Drop Zone Enhancement

Make the drop zone larger and more inviting since this is the primary entry point:
- Larger icon and text
- Emphasize "Play, then analyze, convert, or edit" in the sublabel
- Show a few format badges (WAV, FLAC, MP3, MP4...) as small chips

---

## Technical Details

### New files

| File | Purpose |
|------|---------|
| `src/stores/file-transfer-store.ts` | Zustand store for cross-tool file passing |
| `src/components/shared/ToolActionGrid.tsx` | Reusable grid of compatible tool links for a given file |

### Modified files

| File | Changes |
|------|---------|
| `src/pages/tools/MediaPlayer.tsx` | Complete rewrite with prominent layout + action panel |
| `src/config/tool-registry.ts` | Move media-player to top-level or give it a distinct position (no category change needed, but update description) |

### Target tool integration (file consumption)

Each tool that has a `FileDropZone` needs a small addition: on mount, check `useFileTransferStore` for a pending file and auto-load it. This is a ~5 line addition per tool file. Tools to update:

**Audio analysis** (9 tools): HiResVerifier, SpectrogramViewer, LufsMeter, DynamicRangeMeter, WaveformViewer, StereoAnalyzer, FileInspector, LossyDetector, SpectrumAnalyzer

**Audio processing** (8 tools): AudioConverter, AudioTrimmer, AudioNormalizer, WaveformImage, TagEditor, MetadataStripper, SampleRateConverter, ChannelOps

**Video** (7 tools): VideoToMp3, VideoTrimmer, VideoCompressor, VideoToGif, VideoConverter, VideoMute, VideoToAudio

**Other** (2 tools): FreqResponse, AudioComparator, BatchAnalyzer

The pattern for each tool:

```text
import { useFileTransferStore } from '@/stores/file-transfer-store';

// Inside component, before the return:
useEffect(() => {
  const pending = useFileTransferStore.getState().consumePendingFile();
  if (pending) setFile(pending);  // or handleFile(pending), etc.
}, []);
```

### ToolActionGrid component

Props: `file: File`, `currentToolId: string`

Logic:
1. Get file extension from `file.name`
2. Filter `TOOLS` to those with `acceptsFormats` containing the extension
3. Exclude current tool, generators, and reference-only tools
4. Group by category
5. Render as a labeled grid of clickable cards
6. On click: `useFileTransferStore.getState().setPendingFile(file)` then `navigate(tool.route)`

### Implementation order

1. Create `file-transfer-store.ts`
2. Create `ToolActionGrid.tsx` component
3. Rewrite `MediaPlayer.tsx` with prominent layout + action grid
4. Add pending file consumption to all 26+ tool pages
