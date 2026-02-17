
# Fix: Toolbar Layout Jank, Dark Canvas on Fullscreen, and Page Layout

## Issues Found

### 1. Reset button appearing/disappearing shifts toolbar layout
Line 93 in VizToolbar: `{zoom.isZoomed && (` conditionally renders the Reset button, causing every other element in the flex row to shift when zoom state changes.

**Fix**: Always render the Reset button but use `invisible` (CSS visibility:hidden) when not zoomed. This reserves the space and prevents layout reflow.

### 2. Canvas is dark (blank) on initial fullscreen and when returning
The ResizeObserver in each canvas component updates `sizeRef` (a ref) and sets `canvas.width/height`. But the paint effect depends on `sizeRef.current.w` in its dependency array. Since `sizeRef` is a ref, mutating it does NOT trigger a React re-render, so the paint effect never re-runs after a resize. Setting `canvas.width` also clears the canvas, so it goes dark.

**Fix**: Replace `sizeRef` with `useState` for canvas dimensions. When ResizeObserver fires, call `setSize({w, h})` which triggers a re-render, which re-runs the paint effect. This affects all 4 canvas components.

### 3. "Analyze another file" button is isolated at the bottom
Currently placed outside the viz container, far from the action area.

**Fix**: Move it into the toolbar row (right side, before fullscreen/download) as a small ghost button, so it's always accessible without scrolling.

### 4. Help text appears/disappears on zoom
`{viz.isZoomed && (<p>Scroll to zoom...)}` on every tool page causes a layout shift.

**Fix**: Always show the help text but use `invisible` when not zoomed, same pattern as the Reset button. Or better: always show it (it's useful guidance even when not zoomed).

## Technical Changes

### `src/components/shared/VizToolbar.tsx`
- Line 93-97: Always render the Reset button; add `invisible` class when `!zoom.isZoomed` so it reserves space but is hidden.

### `src/components/visualizations/SpectrogramCanvas.tsx`
- Replace `sizeRef` (useRef) with `useState` for `{w, h}`.
- ResizeObserver callback calls `setSize({w, h})` instead of mutating a ref.
- Paint effect depends on `size.w, size.h` (real state) so it re-runs after resize.
- Remove `sizeRef.current.w, sizeRef.current.h` from deps, replace with `size.w, size.h`.

### `src/components/visualizations/WaveformCanvas.tsx`
- Same ref-to-state change as SpectrogramCanvas.

### `src/components/visualizations/SpectrumCanvas.tsx`
- Same ref-to-state change.

### `src/components/visualizations/LoudnessHistoryCanvas.tsx`
- Same ref-to-state change.

### `src/pages/tools/SpectrogramViewer.tsx`
- Change zoom hint text (line 130-132) to always render, use `opacity-0` when not zoomed OR just always show it.
- Move "Analyze another file" button into the VizToolbar area or just above the viz container so it's not isolated at the bottom.

### All other tool pages (WaveformViewer, SpectrumAnalyzer, FreqResponse, LufsMeter, IRViewer)
- Same: always show hint text, reposition "Analyze another file" button.
