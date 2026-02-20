

# Add Audio Merger and Audio Splitter Tools

## Overview
Two new ffmpeg-based processing tools that handle multi-file concatenation and single-file splitting.

---

## Tool 1: Audio Merger

**Purpose**: Concatenate 2+ audio files into a single output file, in user-defined order.

**User flow**:
1. Drop multiple audio files (or add more one by one)
2. Reorder files via drag handles (same pattern as playlist)
3. Choose output format (same format selector as Audio Converter)
4. Optional gain control
5. Process and download merged file

**FFmpeg approach**: Use the concat demuxer (`-f concat -safe 0 -i list.txt`) which writes a temporary text file listing inputs. This handles different codecs gracefully and is the standard approach for joining audio.

**New preset function** in `presets.ts`:
```typescript
function audioMergeArgs(
  fileListName: string, 
  outputName: string, 
  format: string, 
  bitrate?: number
): string[]
```

---

## Tool 2: Audio Splitter

**Purpose**: Split one audio file into 2+ segments at user-specified time points.

**User flow**:
1. Drop an audio file
2. File decodes and shows waveform
3. Add split points by clicking on the waveform or entering times manually
4. See a list of resulting segments with durations
5. Process all splits (sequential ffmpeg calls using trim preset)
6. Download individual segments or all as separate files

**FFmpeg approach**: Reuse the existing `trimArgs()` preset for each segment, running them sequentially. Each segment produces one output file.

**No new preset needed** -- reuses `trimArgs` with computed start/end for each segment.

---

## Files to Create

### `src/pages/tools/AudioMerger.tsx`
- Multi-file drop zone (reuse `FileDropZone` with `multiple`)
- Sortable file list with drag handles, remove buttons, and file info
- Output format selector (reuse `AUDIO_OUTPUT_FORMATS` from presets)
- Gain control
- Progress bar and download button
- Destructive "Start over" button inline with action buttons

### `src/pages/tools/AudioSplitter.tsx`
- Single file drop zone
- Interactive waveform with clickable split point markers
- Manual time input for adding/editing split points
- List of resulting segments with computed durations
- Sequential processing with per-segment progress
- Download individual segments or "Download All"
- Destructive "Start over" button inline with action buttons

---

## Files to Modify

### `src/engines/processing/presets.ts`
- Add `audioMergeArgs()` function for the concat demuxer approach
- Add `audioSplitArgs()` helper that generates trim args for each segment

### `src/config/tool-registry.ts`
- Add `audio-merger` tool definition in the Audio Processing category
- Add `audio-splitter` tool definition in the Audio Processing category

### `src/App.tsx`
- Add lazy imports for `AudioMerger` and `AudioSplitter`
- Add routes: `/audio-merger` and `/audio-splitter`

### `src/config/tool-faqs.ts`
- Add FAQ entries for both new tools

---

## Technical Details

### Merger - concat demuxer approach
The ffmpeg concat demuxer requires writing a file list to the virtual filesystem:
```
file 'input1.mp3'
file 'input2.mp3'
```
Then: `-f concat -safe 0 -i filelist.txt -c copy output.mp3` (copy mode when formats match) or with re-encoding when output format differs from inputs.

The merger page will write all input files to ffmpeg's VFS, create the file list, run the command, and clean up.

### Splitter - sequential trim calls
For N split points, produces N+1 segments. Each segment uses the existing `trimArgs(input, output, start, end)` preset. Files are processed sequentially (ffmpeg.wasm limitation) and collected into an array of blobs for individual or batch download.

### UI patterns followed
- Same `FileDropZone`, `FileInfoBar`, `AudioPlayer`, `ProgressBar`, `DownloadButton` shared components
- Same `useFFmpeg` hook for processing
- Same destructive button styling for "Start over"
- Same caching pattern with `cacheFile`/`getCachedFile`
- Same settings persistence with `useToolSettingsStore`

