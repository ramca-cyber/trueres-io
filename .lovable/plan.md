
# Seamless Media Player / Mini Player Handoff

## Goal
Make the full Media Player page and the Mini Player act as two views of the same playback session -- navigating away keeps music playing in the mini player, and returning restores the full UI exactly where you left off. No interruption, no queue loss.

## How It Works Today (the problem)
- The queue, current track index, shuffle, loop mode, etc. all live as local `useState` inside the `MediaPlayer` component
- When you navigate away, the component unmounts and all state is destroyed
- On mount, the MediaPlayer **deactivates** the MiniPlayer (line 390-394), killing any ongoing playback
- The MiniPlayer creates its own separate audio element, so there's no shared playback

## What Changes

### 1. Move playback state to the global Zustand store
Expand `mini-player-store.ts` to hold the full shared state: queue, currentIndex, shuffle, shuffleOrder, loopMode, crossfadeSec, sleepMode, audioOnlyMode, showSpectrum, showSpectrogram. This becomes the single source of truth for both views.

### 2. MediaPlayer reads from and writes to the store
Instead of local `useState` for queue/index/shuffle/loop, the MediaPlayer component will read from and dispatch to the Zustand store. When you load files, change tracks, toggle shuffle -- it all updates the store directly.

### 3. On navigate away: playback continues in MiniPlayer
Remove the "pause + activate" minimize logic. Instead, when MediaPlayer unmounts:
- Playback is already driven by the store, so the MiniPlayer (always rendered in AppShell) simply picks up the audio element and keeps playing
- No pause/resume gap

### 4. On navigate back: MediaPlayer restores from store
Remove the "deactivate MiniPlayer on mount" logic. Instead, when MediaPlayer mounts:
- It reads queue, currentIndex, playback position from the store
- It takes over rendering the player UI (the MiniPlayer hides itself when the route is `/media-player`)
- Playback continues seamlessly at the current position

### 5. MiniPlayer hides on the Media Player page
Instead of deactivating the store, the MiniPlayer component checks `location.pathname` -- if we're on `/media-player`, it renders nothing (but the store stays active).

## Files to Change

1. **`src/stores/mini-player-store.ts`** -- Expand with: shuffle, shuffleOrder, loopMode, crossfadeSec, sleepMode, audioOnlyMode, showSpectrum, showSpectrogram, and their setters. Rename concept to "playback store" internally.

2. **`src/pages/tools/MediaPlayer.tsx`** -- Replace local `useState` calls for queue/index/shuffle/loop/sleep/audioOnly with reads from the Zustand store. Keep UI-only state (popover open, analyserNode ref) local. Remove the `deactivate on mount` effect. Remove the `handleMinimize` pause-then-activate pattern.

3. **`src/components/shared/MiniPlayer.tsx`** -- Add a route check: if current path is `/media-player`, return null (hide). Read shuffle/loop from the store instead of local state.

4. **`src/components/layout/AppShell.tsx`** -- No changes needed (MiniPlayer is already rendered here).

## Technical Notes

- The audio/video `HTMLMediaElement` will still be created per-component (MiniPlayer has its own, MediaPlayer has its own). The handoff moment involves: store holds currentTime, the new element seeks to that position and plays. This creates a near-seamless transition (sub-100ms gap for audio).
- An alternative "zero-gap" approach would be to hoist a single shared audio element into AppShell, but that's significantly more complex and the seek-based handoff is standard practice (Spotify web does the same).
- File blobs (queue items with `playbackSrc`) are already object references in memory, so they survive the store transfer without duplication.
