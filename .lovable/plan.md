
# Universal Media Player Tool

## Overview

Add a new "Media Player" tool that accepts any audio or video file and plays it immediately with the native browser controls. No processing, no analysis -- just drag, drop, and play. This fills a gap: users currently must pick a specific tool to hear/see their file, but sometimes they just want to play it.

## What It Does

- Accepts all supported audio AND video formats (WAV, FLAC, MP3, OGG, AAC, M4A, AIFF, MP4, WebM, AVI, MKV, MOV)
- Auto-detects whether the file is audio or video based on extension
- Shows the appropriate player (`<audio>` or `<video>`) with native controls
- Displays file info (name, size, type) in a `FileInfoBar`
- "Choose different file" button to swap files quickly
- No FFmpeg, no Web Audio API decoding -- pure native browser playback

## New Files

### `src/pages/tools/MediaPlayer.tsx`

The tool page itself. Simple flow:
1. Drop zone accepting `ALL_MEDIA_ACCEPT` formats
2. On file select, check extension to determine audio vs video
3. Render `AudioPlayer` or `VideoPlayer` accordingly
4. Show `FileInfoBar` with file details
5. "Choose different file" button

### Tool Registry Entry

```text
id: 'media-player'
name: 'Media Player'
shortName: 'Player'
route: '/media-player'
category: 'reference'          (fits with utilities/reference -- no processing involved)
engine: 'none'
icon: 'Play'
acceptsFormats: all audio + video formats
keywords: ['play', 'media player', 'audio player', 'video player', 'preview', 'listen']
```

### Route in App.tsx

```text
const MediaPlayer = lazy(() => import("./pages/tools/MediaPlayer"));
// ...
<Route path="/media-player" element={<MediaPlayer />} />
```

### FAQ Entry

Add a FAQ entry in `tool-faqs.ts` with common questions like "What formats are supported?" and "Is my file uploaded anywhere?"

## Technical Details

### Audio vs Video Detection

Use the file extension to decide which player to show:

```text
const ext = file.name.split('.').pop()?.toLowerCase();
const VIDEO_EXTS = ['mp4', 'webm', 'avi', 'mkv', 'mov'];
const isVideo = VIDEO_EXTS.includes(ext);
```

If the extension is unrecognized, fall back to checking `file.type` (e.g., `video/*` vs `audio/*`). If still ambiguous, default to `<video>` (which can also play audio-only files).

### Components Reused

- `ToolPage` -- page wrapper with SEO, FAQ, cross-tool links
- `FileDropZone` -- drag-and-drop with `ALL_MEDIA_ACCEPT`
- `FileInfoBar` -- file name + size display
- `AudioPlayer` -- native `<audio>` with dark mode styling and object URL lifecycle
- `VideoPlayer` -- native `<video>` with dark mode styling and object URL lifecycle
- `Button` -- "Choose different file" action

### Files to create
- `src/pages/tools/MediaPlayer.tsx`

### Files to modify
| File | Change |
|------|--------|
| `src/config/tool-registry.ts` | Add media-player tool definition |
| `src/App.tsx` | Add lazy import + route |
| `src/config/tool-faqs.ts` | Add FAQ entries for media-player |

### Implementation order
1. Add tool definition to `tool-registry.ts`
2. Create `MediaPlayer.tsx` page
3. Add route in `App.tsx`
4. Add FAQ entries
