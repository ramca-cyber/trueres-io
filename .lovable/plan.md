

# Audio-to-Video: Compress Audio, Quality Control, and Cancel Support

## What Changes

Three improvements to the Audio to Video tool (and the underlying FFmpeg infrastructure so cancel works everywhere):

1. **Audio quality selector** -- choose between High (192k AAC), Medium (128k), or Low (96k) to trade quality for speed
2. **Speed optimizations** -- add `-preset ultrafast` and `-r 1` since the video is a still image
3. **Cancel button** -- stop any in-progress FFmpeg conversion; works across all tools that use `useFFmpeg`

## File Changes

### 1. `src/engines/processing/ffmpeg-manager.ts`

- Add a `cancelProcessing()` export that calls `ffmpeg.terminate()` and resets the singleton instance (since terminate destroys the worker -- it must be reloaded next time)
- Update `exec()` to accept an `AbortSignal` and forward it to `ffmpeg.exec(args, timeout, { signal })`

### 2. `src/stores/ffmpeg-store.ts`

- Add a `cancelled` state flag
- Add `setCancelled()` action

### 3. `src/hooks/use-ffmpeg.ts`

- Add a `cancel()` function that calls `cancelProcessing()` from the manager, sets `processing: false` and `cancelled: true` in the store
- Wire an `AbortController` into `process()` so the signal can be passed through
- Return `cancel` and `cancelled` from the hook

### 4. `src/engines/processing/presets.ts`

- Update `audioToVideoArgs()` to accept an `audioBitrate` parameter (default `192`) and add `-preset ultrafast` and `-r 1`
- The function signature becomes: `audioToVideoArgs(audioInput, imageInput, outputName, width, height, audioBitrate)`

### 5. `src/pages/tools/AudioToVideo.tsx`

- Add `audioQuality` state with three presets: High (192k), Medium (128k), Low (96k)
- Add a Quality selector dropdown in the UI (between Resolution and the action buttons)
- Pass the selected bitrate to `audioToVideoArgs()`
- Show a "Cancel" button when processing is in progress
- Handle the cancelled state (show a brief message instead of an error)

## UI for Audio Quality

```text
Audio Quality
[ High (192 kbps) v ]  -- dropdown with High / Medium / Low
```

## UI for Cancel

When processing is active, the "Generate Video" button changes to a red "Cancel" button. If cancelled, a neutral message is shown ("Conversion cancelled") instead of an error.

## Scope

- Cancel support is added at the hook/manager level so it automatically works for every tool using `useFFmpeg`, but the Cancel button UI is only added to AudioToVideo for now (other tools can adopt it later)
- Audio compression only applies to AudioToVideo since other tools have their own format/bitrate controls already
