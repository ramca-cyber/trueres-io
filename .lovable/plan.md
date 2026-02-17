

# Interactive Audio Preview and Waveform Controls

## Overview

Add live audio preview (play before processing) and interactive waveform visualization to the audio processing tools. This uses the **Web Audio API** for instant in-browser playback -- no FFmpeg needed for previewing.

## What's Possible

The browser's Web Audio API can decode audio and play it back with real-time modifications (gain, channel routing, region selection). This means users can **hear the result before committing to the full FFmpeg process**.

## Tools That Benefit

| Tool | What it gets | Why |
|------|-------------|-----|
| **Audio Trimmer** | Interactive waveform with draggable start/end handles + play selection | Most impactful -- users need to hear where to cut |
| **Audio Normalizer** | Before/after preview toggle (applies gain in real-time) | Users want to hear loudness change before downloading |
| **Channel Ops** | Preview mono/left/right/swap via Web Audio routing | Hear which channel you're extracting |
| **Sample Rate Converter** | Waveform display of input (preview not useful -- browser resamples internally) | Visual only, no audible preview difference |
| **Audio Converter** | No preview needed -- format change, not audible difference | Skip |
| **Metadata Stripper** | No preview needed -- no audible change | Skip |

## New Components and Hooks

### 1. `src/hooks/use-audio-preview.ts` -- Web Audio playback engine

A hook that decodes the input file once and provides:
- `playRegion(startSec, endSec)` -- play a specific time range
- `playWithGain(gainDb)` -- play with volume adjustment (normalizer preview)
- `playChannel(mode: 'stereo' | 'left' | 'right' | 'mono' | 'swap')` -- route channels
- `stop()` -- stop playback
- `isPlaying` -- state
- `currentTime` -- for playhead position on waveform
- `duration` -- total decoded duration
- `audioBuffer` -- the decoded AudioBuffer for waveform computation

Uses a single `AudioContext` with `AudioBufferSourceNode` + `GainNode` + `ChannelSplitterNode`/`ChannelMergerNode` as needed.

### 2. `src/components/shared/InteractiveWaveform.tsx` -- Waveform with handles

A canvas-based waveform display (reuses `computeWaveform` from existing code) with:
- **Draggable start/end handles** -- vertical lines the user can drag to set trim region
- **Highlighted selection region** -- shaded area between handles
- **Playhead indicator** -- moving vertical line synced to `currentTime`
- **Click-to-seek** -- click anywhere on waveform to set playhead position
- **Time labels** -- show timestamps at handles and cursor position

Props:
- `audioBuffer: AudioBuffer`
- `startTime / endTime` -- controlled values
- `onStartChange / onEndChange` -- callbacks when handles are dragged
- `currentTime` -- for playhead
- `onSeek` -- click-to-seek callback

### 3. Tool-specific integration

#### Audio Trimmer (biggest upgrade)
- Decode file with Web Audio API on drop
- Show `InteractiveWaveform` with draggable start/end handles
- "Preview Selection" button plays only the selected region
- Remove manual number inputs (or keep as secondary/precise controls)
- Auto-set end time to file duration on load

#### Audio Normalizer
- "Preview" button plays audio with gain adjustment applied via GainNode
- Shows before/after loudness estimate
- Toggle between original and normalized preview

#### Channel Ops
- "Preview" button plays audio with selected channel routing
- Uses ChannelSplitterNode + ChannelMergerNode for real-time channel manipulation

## Technical Details

### Web Audio API playback (no FFmpeg needed for preview)

```text
File -> ArrayBuffer -> AudioContext.decodeAudioData() -> AudioBuffer
                                                            |
                                              AudioBufferSourceNode
                                                            |
                                    [GainNode / ChannelSplitter+Merger]
                                                            |
                                                      destination
```

- `playRegion(start, end)`: Set `source.start(0, startSec, endSec - startSec)`
- `playWithGain(db)`: Connect through GainNode with `gain.value = 10^(db/20)`
- `playChannel('left')`: Use ChannelSplitterNode, route channel 0 to both outputs

### Waveform interaction (canvas mouse/touch events)

```text
+--[========SELECTED REGION========]------------------+
|  |                                |                  |
|  START handle                   END handle           |
|  (draggable)                    (draggable)          |
|                    ^ playhead                        |
+-----------------------------------------------------+
   0:00          0:15            0:45              1:30
```

- Mouse/touch events on canvas calculate time position from x coordinate
- Hit detection on handles (within ~8px tolerance)
- Drag updates `startTime`/`endTime` via callbacks
- `requestAnimationFrame` loop updates playhead position during playback

### Memory management
- AudioBuffer is decoded once per file and held in the hook
- AudioContext is created once, source nodes are created per-play and auto-disposed
- Cleanup on unmount closes the AudioContext

## Implementation Order

1. `use-audio-preview.ts` hook (core playback engine)
2. `InteractiveWaveform.tsx` component (visual + interaction)
3. Upgrade `AudioTrimmer.tsx` (waveform + region select + preview)
4. Upgrade `AudioNormalizer.tsx` (gain preview toggle)
5. Upgrade `ChannelOps.tsx` (channel routing preview)

