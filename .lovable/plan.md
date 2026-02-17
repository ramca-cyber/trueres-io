

# Web Worker Implementation for Audio Analysis

## Problem
All audio analysis (FFT, LUFS, spectrogram, bit depth, bandwidth, lossy detection, stereo, dynamic range, waveform, spectrum) currently runs synchronously on the main thread. On long or high-sample-rate files, this freezes the UI for several seconds.

## Approach
Create a single dedicated Web Worker that handles all analysis tasks. The analysis modules are already pure functions (input: typed arrays, output: plain objects), making them ideal candidates for offloading.

We use a **single worker with a message-based dispatch** pattern rather than one worker per module, keeping things simple and avoiding worker startup overhead.

## Architecture

```text
Main Thread                          Worker Thread
+-----------------+                  +-------------------+
| useAnalysis()   |  postMessage     | analysis-worker   |
|   runAnalysis() | -------------+-->| onmessage:        |
|                 |  (key, PCM   |   |   switch(key)     |
|                 |   transferable)  |   run module      |
|                 |                  |   postMessage      |
|   onmessage <--|------------------+   (result)         |
|   cacheResult   |                  +-------------------+
+-----------------+
```

## Changes

### 1. New file: `src/engines/analysis/analysis-worker.ts`
- A Web Worker script that imports all analysis modules
- Listens for messages with `{ key, channelData, sampleRate, headerInfo }`
- Runs the appropriate analysis function based on `key`
- Posts the result back
- For `verdict`, runs all 4 sub-analyses inside the worker (no round-trips)
- For `waveform`/`spectrum`/`spectrogram`, wraps the result with the required metadata fields

### 2. New file: `src/engines/analysis/worker-client.ts`
- Creates and manages the worker instance (singleton, lazy-initialized)
- Exports `runAnalysisInWorker(key, pcmData, headerInfo)` that returns a `Promise<AnalysisResult>`
- Uses a pending-requests map with unique IDs to match responses to promises
- Transfers `Float32Array` buffers using `Transferable` for zero-copy (with structured clone fallback)
- Includes a `terminateWorker()` cleanup function
- Falls back to main-thread execution if `Worker` is not available

### 3. Modified file: `src/hooks/use-analysis.ts`
- Import and use `runAnalysisInWorker` instead of calling analysis functions directly
- The switch/case block is replaced with a single call to the worker client
- The `verdict` case no longer needs to manually orchestrate sub-analyses (worker handles it internally)
- Caching and `setAnalyzing` logic remains unchanged
- Graceful fallback: if workers are unavailable, keep the current synchronous path

### 4. Modified file: `src/pages/About.tsx`
- The "Web Workers" claim on line 62 is already there but was inaccurate. After this change, it becomes truthful. No text change needed.

### 5. New file: `src/engines/analysis/analysis-worker.test.ts`
- Unit tests for the worker client:
  - Test that analysis runs and returns correct result types
  - Test fallback behavior when Worker is unavailable
  - Test with synthetic PCM data (sine wave) to verify LUFS/bandwidth/bit-depth produce reasonable values

## Technical Details

**Transferable optimization**: Channel data (`Float32Array[]`) is sent to the worker using `Transferable` to avoid copying large buffers. Since the store already holds a reference to the decoded PCM, we send copies (or accept that the original becomes neutered and re-decode if needed). In practice, the simplest approach is to use structured clone (Vite handles this well) since the data stays in the store for other uses.

**Vite worker syntax**: Use `new Worker(new URL('./analysis-worker.ts', import.meta.url), { type: 'module' })` which Vite handles natively with no extra config.

**Message protocol**:
```text
Request:  { id, key, channelData: Float32Array[], sampleRate, bitDepth, headerSampleRate }
Response: { id, key, result, error? }
```

**Verdict handling**: The worker runs bitDepth, bandwidth, lossyDetect, and dynamicRange internally and calls `computeVerdict` with those results, then returns all 5 results at once. The client caches all sub-results.

## Testing Plan
- Create a test with a synthetic 1-second 44100Hz sine wave
- Verify the worker client returns valid `BitDepthResult`, `LUFSResult`, etc.
- Verify the fallback path works when `Worker` is undefined
- Run via `vitest`

