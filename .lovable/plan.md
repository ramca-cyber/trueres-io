

# Audit: Remaining Simultaneous Playback Issues

## What's Already Fixed
The `playback-manager.ts` correctly coordinates all `HTMLMediaElement`-based players (AudioPlayer, VideoPlayer, MiniPlayer). Any page with multiple `<audio>`/`<video>` elements is handled.

## What's NOT Covered

### Issue 1: `useAudioPreview` hook
Used in AudioTrimmer, AudioNormalizer, and ChannelOps. This hook plays audio via `AudioBufferSourceNode` (Web Audio API), not an `<audio>` element. It cannot be registered with the current playback manager.

**Conflict scenario**: User clicks "Preview" (useAudioPreview) while the output AudioPlayer is also playing on the same page, or while the MiniPlayer is active.

**Fix**: Extend `playback-manager.ts` to support a generic "stop callback" registration alongside HTMLMediaElements. The `useAudioPreview` hook registers a `stop()` callback. When any HTMLMediaElement plays, all registered callbacks are called (and vice versa).

Changes:
- `src/lib/playback-manager.ts` -- add `registerCallback(id, stopFn)` and `unregisterCallback(id)`. When any element plays or callback-based source starts, pause/stop everything else.
- `src/hooks/use-audio-preview.ts` -- register its `stop()` function on mount, unregister on unmount. Before playing, call a `notifyPlayStart(id)` function from the manager.

### Issue 2: Generator/Test Pages
Pages like ToneGenerator, NoiseGenerator, HearingTest, BinauralBeats, EarTraining, ChannelBalance, BurnInGenerator, ABXTest, and SweepGenerator use raw oscillators or AudioBufferSourceNodes.

**Conflict scenario**: User has the MiniPlayer active, navigates to ToneGenerator, and clicks Play -- both play at once.

**Fix**: Same pattern. Each generator page registers a stop callback with the playback manager and calls `notifyPlayStart` before starting its oscillator/source.

Changes (each file gets ~4 lines added):
- `src/pages/tools/ToneGenerator.tsx`
- `src/pages/tools/NoiseGenerator.tsx`
- `src/pages/tools/HearingTest.tsx`
- `src/pages/tools/BinauralBeats.tsx`
- `src/pages/tools/EarTraining.tsx`
- `src/pages/tools/ChannelBalance.tsx`
- `src/pages/tools/BurnInGenerator.tsx`
- `src/pages/tools/ABXTest.tsx`
- `src/pages/tools/SweepGenerator.tsx`

## Technical Design

### Updated `playback-manager.ts`

```text
Elements Set (HTMLMediaElement)         Callbacks Map (id -> stopFn)
         |                                        |
         +------------- on play ----------------+
         |   pause all other elements            |
         |   call all registered stop callbacks  |
         +---------------------------------------+

notifyPlayStart(id)  -->  pause all elements
                          call all other callbacks
```

Three exports added:
- `registerCallback(id: string, stopFn: () => void)` -- for Web Audio sources
- `unregisterCallback(id: string)` -- cleanup
- `notifyPlayStart(id: string)` -- called before a Web Audio source starts playing; pauses all HTMLMediaElements and calls all other registered stop callbacks

The existing `register`/`unregister` for HTMLMediaElements stays unchanged. The `onPlay` handler is updated to also invoke all registered stop callbacks.

### Integration Pattern (example for ToneGenerator)

```
// In startPlayback:
notifyPlayStart('tone-generator');

// In useEffect on mount:
registerCallback('tone-generator', stopPlayback);
return () => unregisterCallback('tone-generator');
```

## Summary

- 1 file modified: `src/lib/playback-manager.ts` (add callback support)
- 1 hook modified: `src/hooks/use-audio-preview.ts`
- 9 pages modified: each generator/test page (roughly 4 lines each)
- Result: only one sound source plays at any time, app-wide
