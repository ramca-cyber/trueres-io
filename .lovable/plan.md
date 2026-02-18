
# Persist State Across Refreshes

## The Problem

Refreshing the page loses the loaded file, all settings, and any completed output. Mid-conversion refreshes lose the conversion entirely.

## What's Possible

| What | Persistable? | How |
|------|-------------|-----|
| User settings (format, bitrate, resolution, gain, quality) | Yes | localStorage via zustand `persist` middleware |
| Input file | Yes | IndexedDB (files can be stored as ArrayBuffers) |
| Completed output blob | Yes | IndexedDB |
| In-progress FFmpeg conversion | No | WebAssembly worker is killed on refresh -- impossible to resume |

For active conversions, we **cannot** resume mid-process, but we **can** warn the user before they leave and auto-restart after refresh if desired.

## Approach

### 1. IndexedDB file cache utility

A small helper module (`src/lib/file-cache.ts`) that wraps IndexedDB to store and retrieve Files:

- `cacheFile(key, file)` -- stores file data + name + type
- `getCachedFile(key)` -- returns a reconstructed File or null
- `clearCachedFile(key)` -- removes entry
- `cacheBlob(key, blob, fileName)` -- stores output blobs
- `getCachedBlob(key)` -- returns blob + fileName or null

Each tool gets its own key (e.g., `audio-converter-input`, `audio-to-video-input`).

### 2. Persist tool settings via zustand

Create a small persisted store (`src/stores/tool-settings-store.ts`) using zustand's built-in `persist` middleware with localStorage. This stores per-tool settings like:

- Output format, bitrate, sample rate, channel mode
- Resolution, audio quality (for Audio to Video)
- Gain value

Settings are keyed by tool ID so they don't collide.

### 3. Integration into tool pages

Each tool page gets:
- On file load: cache the input file to IndexedDB
- On mount: check IndexedDB for a cached file and restore it + settings
- On output: cache the output blob to IndexedDB
- On mount with cached output: show the download button immediately
- On "Choose different file": clear the cache

### 4. Warn before leaving during conversion

Add a `beforeunload` event listener in `useFFmpeg` when `processing` is true. The browser will show its native "Are you sure you want to leave?" dialog, giving users a chance to stay.

### 5. Auto-restart option (lightweight)

If a refresh happens during processing, on remount detect that settings + input file exist but no output. Show a banner: "Your previous conversion was interrupted. [Restart] [Dismiss]". No automatic restart -- user clicks to resume.

## File Changes

### New: `src/lib/file-cache.ts`

IndexedDB wrapper (~60 lines):
- Uses a single database `trueres-file-cache` with one object store
- `cacheFile` / `getCachedFile` / `clearCachedFile` for input files
- `cacheBlob` / `getCachedBlob` for output blobs
- All operations are async with try/catch (gracefully degrades if IndexedDB unavailable)

### New: `src/stores/tool-settings-store.ts`

Zustand store with `persist` middleware:
- `getSettings(toolId)` returns the saved settings object
- `setSettings(toolId, settings)` merges and saves
- `clearSettings(toolId)` removes
- Persisted to localStorage under key `tool-settings`

### Modified: `src/hooks/use-ffmpeg.ts`

- Add `beforeunload` listener when `processing === true`
- Remove listener when processing ends

### Modified: Tool pages (7 files)

Each tool page follows the same pattern:

```
// On mount: restore cached file + settings
useEffect(() => {
  getCachedFile('tool-id-input').then(f => { if (f) setFile(f); });
  const saved = getSettings('tool-id');
  if (saved) { setFormat(saved.format); setBitrate(saved.bitrate); ... }
}, []);

// On file select: cache it
const handleFileSelect = (f) => { setFile(f); cacheFile('tool-id-input', f); };

// On settings change: persist
useEffect(() => { setSettings('tool-id', { format, bitrate, gain }); }, [format, bitrate, gain]);

// On output: cache blob
// On clear: clearCachedFile + clearSettings
```

Pages updated:
- `AudioConverter.tsx`
- `AudioTrimmer.tsx`
- `SampleRateConverter.tsx`
- `ChannelOps.tsx`
- `MetadataStripper.tsx`
- `AudioToVideo.tsx`
- `AudioNormalizer.tsx`

## What the User Experiences

1. Load a file and pick settings -- everything is silently cached
2. Refresh the page -- file and settings are restored instantly, ready to process again
3. Complete a conversion -- output blob is cached, download button reappears after refresh
4. Refresh during conversion -- browser warns "are you sure?"; if they proceed, on remount they see "Conversion interrupted" with a Restart button
5. Click "Choose different file" -- cache is cleared cleanly
