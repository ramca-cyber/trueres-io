
# FFT Performance Optimization

## The Problem

The current `fft()` function in `src/engines/analysis/modules/fft.ts` recomputes `Math.cos()` and `Math.sin()` inside the **innermost loop** (lines 31-33). For a single FFT of size N, the trig calls scale as O(N log N). This impacts four analysis modules that call `fft()`:

- **spectrogram.ts** -- hundreds of FFT calls per file (worst case)
- **spectrum.ts** -- up to 200 FFT calls
- **bandwidth.ts** -- multiple FFT calls
- **lossy-detect.ts** -- multiple FFT calls

## The Fix

Pre-compute a **twiddle factor table** for each butterfly stage. The trig values for a given FFT size depend only on `len` and `k`, so they can be computed once per stage (outer loop) instead of once per butterfly (inner loop).

```text
Before (current):
  for each stage (len):
    for each group (i):
      for each butterfly (k):
        cos = Math.cos(angle * k)   // HOT PATH
        sin = Math.sin(angle * k)   // HOT PATH

After (optimized):
  for each stage (len):
    cosTable[k] = Math.cos(angle * k)  // once per stage
    sinTable[k] = Math.sin(angle * k)
    for each group (i):
      for each butterfly (k):
        cos = cosTable[k]  // table lookup
        sin = sinTable[k]
```

This eliminates redundant trig from the inner two loops, yielding the 3-5x speedup noted in the feedback.

## Spectrogram Rendering Verification

Confirmed: `SpectrogramCanvas.tsx` is **fully functional**, not placeholder. It:
- Renders pixel-level spectrogram images using `ImageData` with colormap functions (magma, inferno, viridis, plasma, grayscale)
- Draws frequency and time axis labels
- `SpectrogramViewer.tsx` wires it to the analysis pipeline via `useAnalysis` -> `computeSpectrogram`

No changes needed for the rendering side.

## Scope

Only one file changes: `src/engines/analysis/modules/fft.ts`. All four consumers benefit automatically.

## Technical Detail

The `fft()` function will be updated to:

1. In the butterfly outer loop (`for len = 2..N`), allocate two `Float64Array(halfLen)` arrays
2. Fill them with `cos(angle * k)` and `sin(angle * k)` for `k = 0..halfLen-1`
3. In the inner loop, index into the arrays instead of calling `Math.cos/Math.sin`

The `magnitudeSpectrum`, `powerSpectrum`, and `nextPow2` functions are unchanged.
