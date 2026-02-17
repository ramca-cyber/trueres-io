

# Fix: Prevent All Simultaneous Audio/Video Playback

## Problem
Multiple audio and video players across the app can play at the same time. This happens in:
- Tool pages with both Input and Output previews (12 pages)
- The Audio Comparator with two side-by-side previews
- The MiniPlayer overlapping with any page's player

## Solution
Create a lightweight global playback manager that ensures only one media element plays at a time, app-wide. Every AudioPlayer, VideoPlayer, and MiniPlayer will register with this manager. When any element starts playing, all others are automatically paused.

This is a single shared module + small additions to 3 existing components. No changes needed to individual tool pages.

## Technical Details

### 1. New file: `src/lib/playback-manager.ts`
A singleton module that:
- Maintains a `Set<HTMLMediaElement>` of all registered media elements
- Provides `register(el)` and `unregister(el)` functions
- Listens for the native `play` event on each registered element
- When a `play` event fires, pauses all *other* registered elements
- Simple, framework-agnostic, no React state needed

### 2. Modified: `src/components/shared/AudioPlayer.tsx`
- Import `register`/`unregister` from playback-manager
- In the existing mount effect, call `register(innerRef.current)`
- On unmount, call `unregister(innerRef.current)`
- This is roughly 4 lines of code added

### 3. Modified: `src/components/shared/VideoPlayer.tsx`
- Same pattern: register/unregister the `<video>` element on mount/unmount

### 4. Modified: `src/components/shared/MiniPlayer.tsx`
- Same pattern: register/unregister its `<audio>` element on mount/unmount

### How it works
When the user clicks play on any player anywhere in the app, the browser fires a native `play` event. The playback manager catches it and calls `.pause()` on every other registered element. This covers all combinations: Input vs Output, page player vs MiniPlayer, File A vs File B in comparator, etc.

No changes are needed to any of the 12+ tool pages -- it all works automatically through the shared components.
