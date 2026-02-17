

# Batch Processing for Converters and Processors

## Overview

Add multi-file batch support to all tools where applying the same settings to multiple files makes sense. Files are processed sequentially (ffmpeg.wasm concurrency constraint) with a queue UI showing per-file status.

## Tools That Get Batch Support

| Tool | Rationale |
|------|-----------|
| Audio Converter | Same format/bitrate for all files |
| Audio Normalizer | Same LUFS target for all files |
| Metadata Stripper | Same operation for all files |
| Sample Rate Converter | Same target rate for all files |
| Channel Ops | Same channel operation for all files |
| Video Converter | Same output format for all files |
| Video Compressor | Same CRF for all files |
| Video to MP3 | Same bitrate for all files |
| Video to Audio | Same codec-copy for all files |
| Video Mute | Same audio removal for all files |

**Excluded** (require per-file settings): Audio Trimmer, Video Trimmer, Video to GIF.

## Architecture

### 1. New hook: `src/hooks/use-batch-process.ts`

Manages a queue of files processed sequentially through ffmpeg. Each tool provides a "build args" function, and the hook handles the rest.

```text
Interface:
  - addFiles(files: File[])
  - startProcessing(buildJob: (file) => { inputName, outputName, args })
  - queue: BatchItem[]  (file, status: pending|processing|done|error, outputBlob, error)
  - currentIndex: number
  - isProcessing: boolean
  - clearQueue()
  - removeFile(index)
  - downloadAll() -- triggers individual downloads sequentially
```

State is local (useState), not in a global store, since batch state is tool-specific.

Internally calls `processFile()` from `ffmpeg-manager.ts` directly (not through the `useFFmpeg` hook, which manages a single global store). Calls `getFFmpeg()` once to load the engine, then loops through files one by one.

### 2. New component: `src/components/shared/BatchQueue.tsx`

Displays the file queue as a compact list:

```text
+-----------------------------------------------+
| song1.wav          3.2 MB    [done] [Download] |
| song2.wav          4.1 MB    [processing] 45%  |
| song3.wav          2.8 MB    [pending]         |
| song4.wav          5.0 MB    [pending]         |
+-----------------------------------------------+
| Overall: 2/4 complete                [Add more]|
+-----------------------------------------------+
```

Each row shows: filename (truncated), size, status badge, progress bar (if processing), download button (if done), error message (if failed).

Bottom bar: overall progress, "Add more" button, "Download All" button (when all done).

### 3. Updated tool pages (pattern)

Each tool page gets a simple mode switch:

- **FileDropZone**: enable `multiple` + `onMultipleFiles`
- If 1 file is selected: current single-file UI (unchanged -- keeps audio preview, player, etc.)
- If multiple files: show settings panel + BatchQueue + "Process All" button

This means the single-file UX is completely preserved. Batch mode only activates when the user drops/selects 2+ files.

### 4. Download All

Since browser ZIP generation would require a new dependency, "Download All" will trigger individual file downloads in sequence (one per 200ms to avoid browser blocking). This is simple and dependency-free.

## File Changes

### New Files
- `src/hooks/use-batch-process.ts` -- batch queue hook with sequential ffmpeg processing
- `src/components/shared/BatchQueue.tsx` -- queue display component with per-file status, progress, download

### Modified Files (10 tool pages)
Each gets:
- `multiple` and `onMultipleFiles` added to FileDropZone
- State: `files: File[]` alongside existing `file: File | null`
- When `files.length > 1`: render settings + BatchQueue instead of single-file UI
- When `files.length === 1` or `file !== null`: existing single-file UI (no changes)

Pages:
- `src/pages/tools/AudioConverter.tsx`
- `src/pages/tools/AudioNormalizer.tsx`
- `src/pages/tools/MetadataStripper.tsx`
- `src/pages/tools/SampleRateConverter.tsx`
- `src/pages/tools/ChannelOps.tsx`
- `src/pages/tools/VideoConverter.tsx`
- `src/pages/tools/VideoCompressor.tsx`
- `src/pages/tools/VideoToMp3.tsx`
- `src/pages/tools/VideoToAudio.tsx`
- `src/pages/tools/VideoMute.tsx`

### Modified: `src/components/shared/FileDropZone.tsx`
Minor: add a hint text when `multiple` is true (e.g., "Select multiple files for batch processing").

## Technical Details

- **Concurrency**: Files are processed strictly one at a time (ffmpeg.wasm limitation). The hook awaits each `processFile()` before starting the next.
- **Engine loading**: `getFFmpeg()` is called once before the loop starts. Loading state/errors are surfaced in BatchQueue.
- **Memory**: Each output blob is stored in the queue item. For very large batches this could use significant memory, but this matches existing behavior (single file output blob is already held in memory).
- **Error handling**: If one file fails, processing continues to the next. Failed files show an error badge with retry option.
- **File transfer store**: The existing `consumePendingFile()` pattern continues to work for single-file transfers from Media Player.
