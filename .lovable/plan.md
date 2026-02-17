

# Fix: Prevent Simultaneous Audio Playback

## Problem
When the mini player is opened (via the minimize button), both the full MediaPlayer and the MiniPlayer play audio at the same time. The same can happen in reverse when navigating back from the mini player to the full player.

## Root Cause
- The "minimize" action activates the MiniPlayer but never pauses the MediaPlayer's audio/video element
- The "maximize" action (clicking the expand button on MiniPlayer) navigates to `/media-player` but never deactivates the MiniPlayer
- No coordination exists between the two playback sources

## Fix (3 changes, 2 files)

### 1. MediaPlayer: Pause before minimizing
In `handleMinimize`, pause the current audio/video element before activating the MiniPlayer:

```
const handleMinimize = useCallback(() => {
  if (queue.length > 0) {
    // Pause current playback first
    const el = audioRef.current || videoRef.current;
    if (el) el.pause();
    miniPlayer.activate(queue, currentIndex);
    miniPlayer.setPlaying(true);
  }
}, [queue, currentIndex, miniPlayer]);
```

### 2. MediaPlayer: Deactivate MiniPlayer on mount
When the MediaPlayer page mounts (or when the component has an active queue), deactivate the MiniPlayer to prevent overlap:

```
useEffect(() => {
  if (miniPlayer.active) {
    miniPlayer.deactivate();
  }
}, []); // on mount only
```

### 3. MiniPlayer: Pause before navigating to full player
In the MiniPlayer's "maximize" button handler, deactivate (which stops its audio) before navigating:

```
// Currently:
onClick={() => navigate('/media-player')}

// Fixed:
onClick={() => { deactivate(); navigate('/media-player'); }}
```

## Files Changed
- `src/pages/tools/MediaPlayer.tsx` -- pause before minimize + deactivate MiniPlayer on mount
- `src/components/shared/MiniPlayer.tsx` -- deactivate before navigating to full player
