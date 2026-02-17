

# Fix: Visualization Controls -- Fullscreen Skewing, Cursor Jank, and UX Issues

## Problems Identified

### 1. Fullscreen stretching/skewing
All canvas components (SpectrogramCanvas, WaveformCanvas, SpectrumCanvas, etc.) use hardcoded dimensions (`width=900, height=400`). The CSS class `w-full` stretches the canvas element visually to fill its container, but the internal pixel buffer stays at 900x400. When entering fullscreen, the canvas stretches to fill the entire screen at the wrong aspect ratio, producing distortion.

**Fix**: Use a `ResizeObserver` inside each canvas component to match the canvas pixel buffer to its actual rendered size. Remove the hardcoded `width`/`height` props entirely.

### 2. Cursor readout causes jarring layout shifts
Every mouse move updates `cursor` state in `useVizViewport`, which triggers a React re-render of the entire page. The cursor readout string is computed in a `useMemo` and displayed in the `VizToolbar`. Because the text length changes (e.g., "1.23s / 440 Hz" vs "12.34s / 1.2 kHz"), the toolbar layout shifts on every frame. This also means the entire spectrogram is re-rendered on every mouse move.

**Fix**: 
- Stop storing cursor in React state. Use a ref instead.
- Draw the crosshair and readout text directly on the canvas (as an overlay layer), not in the toolbar. This avoids any React re-renders from mouse movement.
- Remove the `cursorReadout` prop from VizToolbar entirely -- the canvas handles it.

### 3. Pan math has dead code and potential bugs
In `useVizViewport`, the `onMouseMove` handler computes `newOffX`/`newOffY` on lines 142-143 but never uses them, then recomputes on lines 146-152. The unused computation is confusing and the closure captures stale `viewX`/`viewY` values during drag sequences.

**Fix**: Clean up the pan handler to use only one correct calculation, and use refs for current axis state to avoid stale closures.

### 4. Memory leak -- global mouseup listener
Lines 237-242 of `useVizViewport` add a `window.addEventListener('mouseup', ...)` but never remove it. This leaks every time the hook re-mounts.

**Fix**: Move this into a proper `useEffect` with cleanup.

## Technical Changes

### `src/hooks/use-viz-viewport.ts` (rewrite)
- Replace `cursor` React state (`useState`) with a `cursorRef` (`useRef`). The hook no longer returns a `cursor` object that triggers re-renders.
- Instead, expose a `getCursor()` function and a `cursorRef` that canvas components can read during their paint loop.
- Fix pan math: remove dead code on lines 142-143, use functional state updates with refs to avoid stale closures during drag.
- Wrap the global `mouseup` listener in a `useEffect` with proper cleanup (`removeEventListener` on unmount).
- Remove `cursor` from the return type; add `cursorRef` instead.

### `src/components/shared/VizToolbar.tsx`
- Remove the `cursorReadout` prop. The toolbar no longer displays live cursor coordinates (this eliminates the layout jank entirely).
- The readout is now drawn directly on the canvas by each canvas component.

### `src/components/visualizations/SpectrogramCanvas.tsx`
- Remove `width`/`height` props. Add a `ResizeObserver` that reads the canvas element's `clientWidth`/`clientHeight` and sets `canvas.width`/`canvas.height` to match (accounting for `devicePixelRatio` for sharp rendering).
- Read cursor position from `cursorRef` instead of a `cursor` prop. Draw the crosshair and a small text overlay (time/freq) directly on the canvas at the cursor position -- this is purely a paint operation, no React re-render.
- Remove `cursor` from the `useEffect` dependency array so mouse movement does not trigger a full repaint. Instead, use a lightweight `requestAnimationFrame` loop or a second overlay canvas for the crosshair only.

### `src/components/visualizations/WaveformCanvas.tsx`
- Same ResizeObserver pattern for responsive sizing.
- Read cursor from ref, draw crosshair on canvas.
- Remove `cursor` from effect deps.

### `src/components/visualizations/SpectrumCanvas.tsx`
- Same ResizeObserver pattern.
- Read cursor from ref, draw crosshair on canvas.

### `src/components/visualizations/LoudnessHistoryCanvas.tsx`
- Same ResizeObserver pattern.
- Read cursor from ref, draw crosshair on canvas.

### `src/pages/tools/SpectrogramViewer.tsx`
- Remove `cursorReadout` computation and its prop from VizToolbar.
- Pass a `cursorLabel` callback to SpectrogramCanvas so the canvas can format the readout text itself (e.g., a function that takes `(dataX, dataY)` and returns `"1.23s / 4.2 kHz"`).

### All other tool pages using VizToolbar
- Remove `cursorReadout` prop from VizToolbar usage (WaveformViewer, SpectrumAnalyzer, FreqResponse, LufsMeter, IRViewer).
- Pass cursor label formatter to their respective canvas components.

## Result
- Fullscreen works perfectly -- canvas resolution always matches container size.
- Zero layout jank from mouse movement -- crosshair is drawn on canvas, not in React DOM.
- Clean, correct pan/zoom math with no memory leaks.
- Same toolbar for settings (zoom buttons, dB range, colormap, toggles, fullscreen, download) but without the flickering readout.
