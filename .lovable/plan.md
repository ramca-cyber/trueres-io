

# Comprehensive Visualization Controls System

## Problem

All visualization canvases are static images with no direct interaction. The WaveformViewer has external zoom buttons that slice data, but there's no panning, no cursor inspection, no mouse-driven zoom, and no consistency across tools.

## Design Approach

Instead of adding more buttons (left/right/up/down), the right UX is **direct manipulation on the canvas itself** -- this is the standard in every audio/spectrum tool (Audacity, Spek, iZotope, REW). Users expect:

- **Scroll wheel** to zoom (centered on cursor position)
- **Click + drag** to pan
- **Crosshair cursor** with readout (frequency, time, amplitude, dB at cursor)
- **Double-click** to reset view
- **Pinch** to zoom on touch devices

Combined with a small **toolbar** for things you can't do with mouse gestures: fullscreen, PNG export, colormap, toggle overlays.

## Architecture: Two New Pieces

### 1. `useVizViewport` hook -- manages viewport state and canvas interaction

A single reusable hook that any canvas component can adopt. It manages:

```
State:
  - viewX: { offset: 0..1, zoom: 1..maxZoom }   (horizontal viewport)
  - viewY: { offset: 0..1, zoom: 1..maxZoom }   (vertical viewport)
  - cursor: { x, y } | null                      (current mouse position in data coords)

Interactions (attached to canvas element):
  - onWheel: zoom X axis (shift+wheel = zoom Y axis) centered on cursor
  - onMouseDown + onMouseMove: pan in zoomed view
  - onMouseMove (no button): update cursor crosshair position
  - onDoubleClick: reset to full view
  - onTouchStart/Move/End: pinch-to-zoom + drag-to-pan

Output:
  - viewport: { xMin, xMax, yMin, yMax } in normalized 0-1 coords
  - cursor: data coordinates under mouse
  - canvasHandlers: { onWheel, onMouseDown, ... } to spread onto canvas
  - reset(): return to default view
  - zoomIn/zoomOut/panLeft/panRight: for toolbar buttons (accessibility)
```

The hook does NOT render anything -- it just provides state and handlers. Each canvas component uses the viewport to decide what slice of data to render.

### 2. `VizToolbar` component -- settings + accessibility buttons

A compact toolbar rendered above the canvas. Renders only the controls relevant to each viz (all opt-in via props):

- **Zoom controls**: +/- buttons and reset (for keyboard/accessibility, mirrors wheel behavior)
- **Cursor readout**: shows live values at cursor position (e.g., "1.2 kHz / -42 dB")
- **dB range**: min/max sliders (spectrum, spectrogram)
- **Colormap**: dropdown (spectrogram only)
- **Toggles**: ceiling line, Nyquist, octave bands, etc.
- **Fullscreen**: expand canvas container via Fullscreen API
- **Download PNG**: canvas.toBlob() export

## Per-Visualization Behavior

### Waveform (WaveformCanvas, WaveformViewer, IRViewer waveform)
- **X axis**: Time. Wheel zooms time, drag pans horizontally.
- **Y axis**: Amplitude (-1 to +1). No Y zoom needed (fixed range).
- **Cursor readout**: "0.42s / -12.3 dBFS"
- **Crosshair**: vertical line at cursor time position

### Spectrum / Frequency Response (SpectrumCanvas, FreqResponse, IRViewer freq)
- **X axis**: Frequency (log scale, 20 Hz - Nyquist). Wheel zooms frequency range, drag pans.
- **Y axis**: Magnitude (dB). Shift+wheel zooms dB range, or use toolbar sliders.
- **Cursor readout**: "2.4 kHz / -38 dB"
- **Crosshair**: vertical + horizontal lines at cursor

### Spectrogram (SpectrogramCanvas)
- **X axis**: Time. Wheel zooms time, drag pans horizontally.
- **Y axis**: Frequency. Shift+wheel zooms frequency range, drag pans vertically.
- **Cursor readout**: "1.3s / 4.2 kHz / -65 dB"
- **Crosshair**: both axes

### Loudness History (LoudnessHistoryCanvas)
- **X axis**: Time. Wheel zooms, drag pans.
- **Y axis**: LUFS. Shift+wheel zooms LUFS range.
- **Cursor readout**: "12s / -14.2 LUFS"
- **Crosshair**: vertical line + horizontal line

## Implementation Plan

### New Files (2)

**`src/hooks/use-viz-viewport.ts`**
- Manages viewX/viewY state (offset + zoom)
- Returns viewport bounds in normalized 0-1 coordinates
- Returns cursor position in data coordinates
- Provides event handlers to attach to canvas
- Handles wheel zoom (zoom toward cursor), drag pan, pinch-to-zoom, double-click reset
- Configurable: lock Y axis (waveform), set max zoom, set axis types (linear vs log)

**`src/components/shared/VizToolbar.tsx`**
- Renders a row of controls above the canvas
- Slots: zoom buttons, cursor readout, dB range sliders, colormap select, toggle switches, fullscreen button, download button
- All slots are opt-in via props
- Responsive: collapses into a compact layout on mobile

### Modified Canvas Components (4)

**`src/components/visualizations/WaveformCanvas.tsx`**
- Accept `viewport` prop (from useVizViewport)
- Accept `onCursorMove` callback
- Render only the visible slice of peaks/rms based on viewport.xMin/xMax
- Draw crosshair at cursor position
- Spread canvas interaction handlers from the hook

**`src/components/visualizations/SpectrumCanvas.tsx`**
- Accept `viewport` prop
- Map viewport.xMin/xMax to frequency range (log scale)
- Map viewport.yMin/yMax to dB range (replaces hardcoded -100..0)
- Draw crosshair at cursor position

**`src/components/visualizations/SpectrogramCanvas.tsx`**
- Accept `viewport` prop
- Render only the visible time/frequency window
- Draw crosshair at cursor position

**`src/components/visualizations/LoudnessHistoryCanvas.tsx`**
- Accept `viewport` prop
- Render only the visible time/LUFS window
- Draw crosshair at cursor position

### Modified Tool Pages (6)

Each page instantiates `useVizViewport` and passes the viewport + handlers to its canvas, and renders `VizToolbar` above it.

**`src/pages/tools/WaveformViewer.tsx`**
- Replace custom zoom buttons with VizToolbar + useVizViewport
- Remove ZOOM_LEVELS array and manual data slicing

**`src/pages/tools/SpectrumAnalyzer.tsx`**
- Add VizToolbar + useVizViewport (currently has zero controls)

**`src/pages/tools/FreqResponse.tsx`**
- Add VizToolbar + useVizViewport (currently has zero controls)

**`src/pages/tools/SpectrogramViewer.tsx`**
- Move existing colormap/dB/toggle controls into VizToolbar
- Add useVizViewport for zoom+pan on both axes

**`src/pages/tools/LufsMeter.tsx`**
- Add VizToolbar + useVizViewport for the LoudnessHistoryCanvas

**`src/pages/tools/IRViewer.tsx`**
- Both canvases get useVizViewport + VizToolbar
- Bonus: refactor raw canvas drawing to use WaveformCanvas/SpectrumCanvas components for consistency

## Interaction Summary Table

```text
                    Wheel     Shift+Wheel   Drag      Cursor         Double-click
Waveform            Zoom X    (nothing)     Pan X     time, dBFS     Reset
Spectrum            Zoom X    Zoom Y        Pan X+Y   freq, dB       Reset
Freq Response       Zoom X    Zoom Y        Pan X+Y   freq, dB       Reset
Spectrogram         Zoom X    Zoom Y        Pan X+Y   time,freq,dB   Reset
Loudness History    Zoom X    Zoom Y        Pan X+Y   time, LUFS     Reset
```

## What This Replaces

- WaveformViewer's custom zoom buttons (ZoomIn/ZoomOut/RotateCcw + ZOOM_LEVELS array)
- SpectrogramViewer's inline dB sliders and toggle controls
- SpectrumCanvas's hardcoded -100..0 dB range

Everything moves into the unified VizToolbar + useVizViewport system.

