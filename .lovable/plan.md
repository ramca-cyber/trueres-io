

# Fix: Audio Converter Not Working

## Root Cause

The Audio Converter fails silently because **`loadError` is never shown in the UI**. When ffmpeg.wasm fails to load (likely due to CORS or network issues fetching the WASM binary from unpkg.com), the error is captured in `loadError` state but `AudioConverter.tsx` only renders `processError` -- not `loadError`. This causes the exact behavior you described: button disables briefly, re-enables, and nothing happens with no visible feedback.

## Changes

### 1. `src/pages/tools/AudioConverter.tsx`
- Destructure `loadError` from `useFFmpeg()`
- Display `loadError` alongside `processError` so users see what went wrong
- Show a retry button when load fails

### 2. `src/hooks/use-ffmpeg.ts`
- Fix the fragile `args[1]` input name extraction on line 55 -- instead, accept `inputName` as a separate parameter so it's explicit and not dependent on FFmpeg arg ordering
- Update the `process` function signature to: `process(inputFile, inputName, outputName, args)`

### 3. `src/pages/tools/AudioConverter.tsx` (call site update)
- Pass `inputName` explicitly to `process()` instead of relying on it being extracted from args

### 4. Apply same `loadError` display fix to other FFmpeg-based tools
- `VideoToMp3.tsx`, `VideoToAudio.tsx`, `VideoMute.tsx`, `VideoCompressor.tsx`, `VideoConverter.tsx`, `VideoToGif.tsx`, `VideoTrimmer.tsx`, `AudioTrimmer.tsx`, `AudioNormalizer.tsx`, `MetadataStripper.tsx`, `SampleRateConverter.tsx`, `ChannelOps.tsx` -- add `loadError` display wherever `useFFmpeg()` is used

## Technical Details

**`use-ffmpeg.ts` process signature change:**
```
// Before
process(inputFile: File, outputName: string, args: string[])

// After  
process(inputFile: File, inputName: string, outputName: string, args: string[])
```

This eliminates the brittle `args[1]` extraction that assumes the FFmpeg input filename is always the second argument.

**Error display pattern (added to all FFmpeg tool pages):**
```tsx
{(processError || loadError) && (
  <p className="text-sm text-destructive">{processError || loadError}</p>
)}
```

