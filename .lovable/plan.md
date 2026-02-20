

# Add Video Merger and Video Splitter Tools

## Overview
Two new video processing tools mirroring the existing Audio Merger and Audio Splitter, adapted for video files.

---

## Tool 1: Video Merger

**Purpose**: Concatenate 2+ video files into a single output.

**User flow**:
1. Drop multiple video files (or add more one by one)
2. Reorder files via drag handles
3. Choose output format (MP4 or WebM)
4. Process and download merged video

**FFmpeg approach**: Use the concat demuxer with re-encoding to ensure codec compatibility across different input files. The command structure mirrors `audioMergeArgs` but uses video codecs.

---

## Tool 2: Video Splitter

**Purpose**: Split one video file into 2+ segments at user-specified time points.

**User flow**:
1. Drop a video file
2. Preview video with playback controls
3. Add split points by entering times manually or grabbing current playback position (same Clock button pattern as VideoTrimmer)
4. See a list of resulting segments with durations
5. Process all splits sequentially using `trimArgs` with `-c copy` (fast, no re-encoding)
6. Download individual segments or all

**FFmpeg approach**: Reuses existing `trimArgs()` preset for each segment (same as Audio Splitter).

---

## Files to Create

### `src/pages/tools/VideoMerger.tsx`
- Multi-file drop zone using `VIDEO_ACCEPT`
- Drag-and-drop sortable file list (same pattern as AudioMerger)
- Output format selector using `VIDEO_OUTPUT_FORMATS` from presets
- Writes all input files to ffmpeg VFS, creates `filelist.txt`, runs concat with re-encoding
- VideoPlayer preview of output
- Progress bar, download button, destructive "Start over" inline with actions

### `src/pages/tools/VideoSplitter.tsx`
- Single file drop zone using `VIDEO_ACCEPT`
- VideoPlayer with ref for currentTime access
- Manual time input + "set to current time" Clock button (same as VideoTrimmer)
- Split point list with segment durations and remove buttons
- Sequential `trimArgs` processing for each segment
- Download individual segments or "Download All"
- Destructive "Start over" inline with actions

---

## Files to Modify

### `src/engines/processing/presets.ts`
- Add `videoMergeArgs()` function for concat demuxer with video re-encoding (libx264 + aac for MP4, libvpx-vp9 + libopus for WebM)

### `src/config/tool-registry.ts`
- Add `video-merger` and `video-splitter` tool definitions in the Video Processing category

### `src/App.tsx`
- Add lazy imports and routes for `/video-merger` and `/video-splitter`

### `src/config/tool-faqs.ts`
- Add FAQ entries for both new tools

---

## Technical Details

### Merger - concat with re-encoding
Unlike audio where codec-copy sometimes works, video files almost always have different codecs/resolutions, so re-encoding is required:
- MP4 output: `-c:v libx264 -crf 23 -c:a aac`
- WebM output: `-c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus`

### Splitter - codec copy for speed
Video splitting uses `-c copy` (the existing `trimArgs` default) for near-instant splitting without quality loss. This is the same approach used by VideoTrimmer.

### Preset function
```typescript
function videoMergeArgs(
  fileListName: string,
  outputName: string,
  format: string
): string[]
```

### UI patterns followed
- Same shared components: FileDropZone, FileInfoBar, VideoPlayer, ProgressBar, DownloadButton
- Same destructive button styling and placement
- Same ffmpeg VFS file management pattern
- Same sequential processing pattern for splitter (ffmpeg.wasm single-process limitation)

