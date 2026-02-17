

# Playlist, Queue, and Playback Controls for Media Player

## Overview

Transform the single-file Media Player into a full playlist-capable player with queue management, shuffle, loop modes, drag-to-reorder, and auto-advance. The player area stays as-is; a **playlist panel** appears below it once multiple files are loaded.

## Features

### 1. Multi-file Queue
- Change the drop zone to accept **multiple files** at once (already supported by `FileDropZone` via its `multiple` + `onMultipleFiles` props)
- Also allow adding more files to an existing queue via an "Add files" button
- Each file becomes a track in the playlist

### 2. Playlist Panel

```text
+------------------------------------------+
|  Now Playing: song-02.flac               |
+------------------------------------------+
|        [ Audio / Video Player ]          |
+------------------------------------------+
|  Queue (5 tracks)        [+Add] [Clear]  |
|  ┌──────────────────────────────────┐    |
|  │ = 01. intro.mp3         0:32  x │    |
|  │ = 02. song-02.flac  >> 3:45  x │    |  << currently playing
|  │ = 03. demo.wav          1:12  x │    |
|  │ = 04. clip.mp4          0:58  x │    |
|  │ = 05. outro.ogg         2:01  x │    |
|  └──────────────────────────────────┘    |
|                                          |
|  [Shuffle]  [Loop: Off / One / All]      |
|  [<< Prev]  [>> Next]                   |
+------------------------------------------+
```

### 3. Playback Controls
- **Previous / Next**: Navigate the queue
- **Shuffle**: Randomize playback order (Fisher-Yates on a separate index array, preserving the visual list order)
- **Loop modes** (cycle through on click):
  - **Off**: Stop after the last track
  - **One**: Repeat the current track
  - **All**: Loop back to the first track after the last

### 4. Drag-to-Reorder
- Each track row has a drag handle (grip icon on the left)
- Implement with native HTML drag-and-drop (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) -- no library needed for a simple vertical list
- Reordering updates the queue array; if shuffle is on, the shuffle order recalculates

### 5. Auto-Advance
- Listen for the `ended` event on the `<audio>` / `<video>` element
- On track end: apply loop logic, then load and play the next track
- Transcoding-needed files are transcoded on-the-fly when they become the active track (not pre-transcoded)

### 6. Track Removal
- Each row has an "x" button to remove it from the queue
- If the currently playing track is removed, auto-advance to the next one

### 7. Keyboard Shortcuts
- **Space**: Play/pause (only when not focused on an input)
- **N**: Next track
- **P**: Previous track

## Technical Details

### New file

| File | Purpose |
|------|---------|
| `src/components/shared/PlaylistPanel.tsx` | Playlist UI: track list with drag reorder, remove, now-playing indicator |

### Modified files

| File | Changes |
|------|---------|
| `src/pages/tools/MediaPlayer.tsx` | Major rework: multi-file state, queue management, playback controls, auto-advance via `onEnded`, keyboard shortcuts |
| `src/components/shared/AudioPlayer.tsx` | Add `onEnded` callback prop; expose ref for programmatic control |
| `src/components/shared/VideoPlayer.tsx` | Add `onEnded` callback prop (ref already supported) |

### State model in MediaPlayer.tsx

```text
queue: QueueItem[]          // { id, file, playbackSrc?, isVideo, status }
currentIndex: number        // index into queue
shuffleOn: boolean
shuffleOrder: number[]      // shuffled indices
loopMode: 'off' | 'one' | 'all'
```

- `QueueItem.status`: `'pending' | 'transcoding' | 'ready' | 'error'`
- When a track becomes active, if it needs transcoding, kick off transcoding and show progress inline on that row
- Once ready, set `playbackSrc` and auto-play

### PlaylistPanel.tsx component

Props:
```text
queue: QueueItem[]
currentIndex: number
onSelect: (index: number) => void
onRemove: (index: number) => void
onReorder: (fromIndex: number, toIndex: number) => void
onAddFiles: () => void
onClear: () => void
```

Renders:
- Header with track count, "Add" button, "Clear" button
- Scrollable list (using existing `ScrollArea` component)
- Each row: drag handle (GripVertical icon), track number, filename (truncated), file size, remove button (X icon)
- Currently playing row gets a highlighted background and a small playing indicator icon
- Transcoding rows show a small spinner instead of the track number

### AudioPlayer / VideoPlayer changes

Both need:
- `onEnded?: () => void` prop, passed to the underlying `<audio>` / `<video>` element
- `autoPlay?: boolean` prop for auto-playing when a new track loads

AudioPlayer additionally needs a `ref` forwarded to the `<audio>` element (VideoPlayer already supports this).

### Drag-and-drop reorder implementation

Pure HTML5 drag-and-drop on the playlist rows:
- `draggable` attribute on each row
- `onDragStart`: store the dragged index
- `onDragOver`: `e.preventDefault()` + visual drop indicator
- `onDrop`: call `onReorder(fromIndex, toIndex)` which splices the queue array

### Flow when user drops multiple files

1. All files added to queue
2. First file becomes active immediately
3. If it needs transcoding, show progress; otherwise play immediately
4. Remaining files sit in queue as `'pending'`

### Flow on track end (auto-advance)

1. If `loopMode === 'one'`: replay current track (reset `currentTime` to 0)
2. Get next index (from `shuffleOrder` if shuffle is on, otherwise `currentIndex + 1`)
3. If next index exceeds queue length:
   - `loopMode === 'all'`: wrap to 0
   - `loopMode === 'off'`: stop (do nothing)
4. Set `currentIndex` to next, trigger transcoding if needed, then play

### Implementation order

1. Update `AudioPlayer.tsx` -- add `onEnded` and `autoPlay` props, forward ref
2. Update `VideoPlayer.tsx` -- add `onEnded` and `autoPlay` props
3. Create `PlaylistPanel.tsx` -- track list with drag reorder, remove, indicators
4. Rewrite `MediaPlayer.tsx` -- multi-file queue, playback controls, shuffle/loop, keyboard shortcuts, auto-advance

