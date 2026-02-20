

# Unified Playback Engine -- Single Shared Media Element

## Goal
Eliminate the two-element handoff entirely. One `<audio>` element and one `<video>` element live permanently in the AppShell. Both the full Media Player page and the Mini Player are pure UI skins controlling the same underlying elements. Navigation causes zero interruption -- not even a sub-100ms seek gap.

## Architecture

A new `PlaybackEngine` component is rendered in `AppShell` alongside the existing `MiniPlayer`. It owns:
- A single `<audio>` element (hidden, always mounted)
- A single `<video>` element (hidden by default, portaled into the Media Player page when visible)
- The Web Audio graph (EQ filters, gain, analyser) -- built once, persists forever
- All playback event listeners (timeupdate, ended, play, pause)

A React context (`PlaybackContext`) exposes the element refs, the analyser node, and control functions to any consumer.

## What Changes

### 1. New file: `src/components/shared/PlaybackEngine.tsx`
- Renders hidden `<audio>` and `<video>` elements
- Creates the Web Audio graph (3-band EQ, GainNode, AnalyserNode) on first audio play
- Listens to store changes (queue, currentIndex) and updates `element.src` accordingly
- Handles `timeupdate` -> `store.setTime()`, `ended` -> advance logic, `play/pause` -> `store.setPlaying()`
- Manages object URL lifecycle (create/revoke as tracks change)
- Registers with the playback manager

### 2. New file: `src/context/PlaybackContext.tsx`
- React context providing:
  - `audioRef: RefObject<HTMLAudioElement>`
  - `videoRef: RefObject<HTMLVideoElement>`
  - `analyserNode: AnalyserNode | null`
  - `videoPortalTarget: HTMLDivElement | null` + `setVideoPortalTarget(el)`
- The MediaPlayer calls `setVideoPortalTarget(myContainerDiv)` on mount, clears it on unmount
- The PlaybackEngine uses a React portal to render the `<video>` into this target when set, otherwise keeps it hidden

### 3. Update: `src/components/layout/AppShell.tsx`
- Wrap children with `PlaybackProvider`
- Add `<PlaybackEngine />` next to `<MiniPlayer />`

### 4. Update: `src/components/shared/MiniPlayer.tsx`
- Remove its own `<audio>` and `<video>` elements entirely
- Remove all object URL creation, event listeners, and seek logic
- Read `currentTime`, `duration`, `isPlaying` directly from the store (already does this)
- For play/pause: call `audioRef.current.play()` / `.pause()` via context
- For seeking: set `audioRef.current.currentTime` via context
- Becomes a thin ~80-line UI-only component

### 5. Update: `src/pages/tools/MediaPlayer.tsx`
- Remove `<AudioPlayer>` and `<VideoPlayer>` component usage
- Instead, use context to get `audioRef`, `videoRef`, `analyserNode`
- On mount: call `setVideoPortalTarget(containerRef.current)` so the shared video element appears inside the player area
- On unmount: clear the portal target (video goes back to hidden)
- Volume, speed, EQ controls directly manipulate the shared Web Audio nodes via context
- The `WaveformSeekbar`, `LiveSpectrum`, `LiveSpectrogram` receive the shared `audioRef.current` and `analyserNode` -- no change needed in those components

### 6. Unchanged files
- `src/components/shared/WaveformSeekbar.tsx` -- already takes `audioElement` as prop
- `src/components/shared/LiveSpectrum.tsx` -- already takes `analyserNode` as prop
- `src/components/shared/LiveSpectrogram.tsx` -- same
- `src/stores/mini-player-store.ts` -- already has all needed state

## Video Portal Pattern

When on the Media Player page:
```text
AppShell
  +-- PlaybackEngine
  |     audio (hidden, always here)
  |     video --> portaled into MediaPlayer's container
  +-- MediaPlayer
        [video-container div] <-- video appears here via React portal
        WaveformSeekbar
        LiveSpectrum
        Transport controls
  +-- MiniPlayer (hidden, route is /media-player)
```

When on any other page:
```text
AppShell
  +-- PlaybackEngine
  |     audio (hidden, keeps playing)
  |     video (hidden, keeps playing if video track)
  +-- SomeOtherTool
  +-- MiniPlayer (visible, shows transport controls)
```

## Technical Notes

- **Web Audio "one source" rule**: `createMediaElementSource()` can only be called once per element. Since the element now lives forever, the graph is created once and never torn down -- this is actually simpler and more correct than the current approach.
- **Object URLs**: Managed in PlaybackEngine only. Created when `currentIndex` changes, revoked when replaced or on deactivate.
- **EQ state**: Already in the Zustand store (`bass`, `mid`, `treble` can be added as needed, or kept as context-local state in PlaybackEngine since they're audio-graph-specific).
- **Crossfade/gapless**: The pre-buffer logic stays in PlaybackEngine (or MediaPlayer) since it's an advanced feature. The secondary pre-buffer audio element is separate from the main shared one.

## Files Summary

| File | Action |
|------|--------|
| `src/components/shared/PlaybackEngine.tsx` | **New** -- shared media elements + Web Audio graph |
| `src/context/PlaybackContext.tsx` | **New** -- context for refs and controls |
| `src/components/layout/AppShell.tsx` | **Edit** -- add provider + engine |
| `src/components/shared/MiniPlayer.tsx` | **Edit** -- strip to UI-only, use context |
| `src/pages/tools/MediaPlayer.tsx` | **Edit** -- remove AudioPlayer/VideoPlayer, use context + portal |

