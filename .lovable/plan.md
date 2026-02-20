

# Fix: "Next track" crashes in Media Player

## Root Cause

The `AudioPlayer` component uses `createMediaElementSource()` from the Web Audio API to connect the `<audio>` element to an audio processing graph (EQ, analyser, gain). This API method can only be called **once per `<audio>` element** -- ever. Even closing the old `AudioContext` does not release the binding.

When you click "Next", React keeps the same `AudioPlayer` component mounted (same position in the tree) and just updates its `src` prop. The internal effect tries to create a new `MediaElementSource` on the same DOM element, which throws an `InvalidStateError`.

## Fix

Add a `key` prop to `AudioPlayer` (and `VideoPlayer` for consistency) in `MediaPlayer.tsx`, tied to the current track's unique ID. This forces React to fully unmount the old player and mount a fresh one with a brand-new `<audio>` element when the track changes.

### File: `src/pages/tools/MediaPlayer.tsx`

**Line ~529** -- AudioPlayer render:
```tsx
// Before
<AudioPlayer ref={audioRef} src={current.playbackSrc} onEnded={handleEnded} autoPlay={autoPlay}
  onAnalyserReady={setAnalyserNode} />

// After
<AudioPlayer key={current.id} ref={audioRef} src={current.playbackSrc} onEnded={handleEnded} autoPlay={autoPlay}
  onAnalyserReady={setAnalyserNode} />
```

**Line ~527** -- VideoPlayer render:
```tsx
// Before
<VideoPlayer ref={videoRef} src={current.playbackSrc} onEnded={handleEnded} autoPlay={autoPlay} />

// After
<VideoPlayer key={current.id} ref={videoRef} src={current.playbackSrc} onEnded={handleEnded} autoPlay={autoPlay} />
```

This is a one-line-per-component change. When the track ID changes, React destroys the old player (cleaning up the AudioContext and MediaElementSource) and creates a fresh one, avoiding the `InvalidStateError`.

