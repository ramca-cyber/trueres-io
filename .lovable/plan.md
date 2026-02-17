

# Fix: "createMediaElementSource" Error on File Change

## Root Cause

In `src/components/shared/AudioPlayer.tsx`, the Web Audio graph setup effect (line 51-105) depends on `[url]`. Every time a new file is loaded, `url` changes, the effect re-runs, and calls `ctx.createMediaElementSource(el)` on the same `<audio>` element. However, the Web Audio spec only allows an `HTMLMediaElement` to be connected to a `MediaElementSourceNode` **once in its lifetime** -- even after the previous `AudioContext` is closed.

## Fix

**Strategy**: Create the `MediaElementSourceNode` only once per `<audio>` element mount, and keep it alive across file changes. The audio graph (filters, gain, analyser) is created once and reused. Only the `src` attribute on the `<audio>` element changes when a new file is loaded.

### Changes to `src/components/shared/AudioPlayer.tsx`

1. **Remove `url` from the Web Audio effect's dependency array** (line 105) -- change it to `[]` (mount-only) or use a ref-based guard.

2. **Use a ref-based guard** to ensure `createMediaElementSource` is only called once per element:
   - Add a `connectedRef = useRef(false)` flag
   - In the effect, check `if (connectedRef.current) return;` before creating the source
   - Set `connectedRef.current = true` after connecting

3. **Do NOT close the AudioContext on cleanup** of this effect (since the source can't be re-created). Instead, close it only on component unmount via a separate cleanup effect.

4. **Keep the `url` effect separate** (lines 44-48) -- it already correctly manages object URLs independently.

### Technical Detail

```
// Before (breaks on 2nd file):
useEffect(() => {
  const el = innerRef.current;
  if (!el || ctxRef.current) return;    // guard fails after cleanup nulls ctxRef
  const ctx = new AudioContext();
  const source = ctx.createMediaElementSource(el);  // CRASH
  ...
}, [url]);

// After (works):
useEffect(() => {
  const el = innerRef.current;
  if (!el || sourceRef.current) return;  // only create once per element
  const ctx = new AudioContext();
  const source = ctx.createMediaElementSource(el);
  ...
  // no cleanup that nulls refs -- graph stays alive
}, []);

// Separate unmount cleanup:
useEffect(() => {
  return () => {
    ctxRef.current?.close().catch(() => {});
  };
}, []);
```

This is a one-file fix affecting only `src/components/shared/AudioPlayer.tsx`.

