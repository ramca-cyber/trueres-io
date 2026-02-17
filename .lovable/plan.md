

# Audio Analysis Tools -- Completeness Evaluation and Enhancement Plan

## Tool-by-Tool Assessment

### 1. Hi-Res Verifier -- COMPLETE
- Verdict banner with score circle and grade (A-F)
- 4 metric cards (Bit Depth, Freq Ceiling, Lossy Artifacts, DR)
- FAQ section, error handling, reset button
- **No changes needed**

### 2. Lossy Detector -- COMPLETE
- Clear pass/fail verdict with icon
- 4 metric cards (Confidence, Spectral Holes, Freq Ceiling, Source Guess)
- Encoder fingerprint display
- Inline spectrogram for visual verification
- **No changes needed**

### 3. File Inspector -- COMPLETE
- Format details table (9 fields)
- Metadata table (artist, album, etc.)
- Collapsible raw header data
- **No changes needed**

### 4. Waveform Image -- COMPLETE
- Customizable dimensions, colors
- PNG export with download button
- **No changes needed** (its purpose is export, not interactive viewing)

---

### 5. LUFS Meter -- NEEDS ENHANCEMENT
Currently shows 4 metric cards + platform compliance badges. Missing a loudness history chart, which is the most useful feature for mastering engineers.

**Add:**
- Short-term loudness over time chart (line graph using the existing `shortTerm[]` array)
- Momentary loudness max metric card

### 6. Dynamic Range Meter -- NEEDS ENHANCEMENT
Shows only 4 metric cards. Feels sparse compared to competitor tools.

**Add:**
- RMS Level metric card
- Loudness war rating context (e.g., "Comparable to: CD-era rock" or "Comparable to: classical recording")
- Visual DR meter bar (horizontal gauge showing where the score falls on a 0-20 scale)

### 7. Stereo Analyzer -- NEEDS ENHANCEMENT
Shows only 4 metric cards with no visualization. Stereo analysis tools universally include visual representations.

**Add:**
- Side Energy metric card (already computed but not displayed)
- Correlation meter visualization (horizontal bar from -1 to +1)
- Balance meter (L/R energy comparison)
- Mono/stereo recommendation text

### 8. Waveform Viewer -- NEEDS ENHANCEMENT
Shows only a bare canvas with no interactivity. Very thin compared to competitors.

**Add:**
- Duration and peak level info cards
- Per-channel toggle (show L/R separately for stereo files)
- Zoom controls (buttons to adjust resolution)

### 9. Spectrum Analyzer -- NEEDS ENHANCEMENT
Shows only a bare canvas. Needs controls and summary metrics.

**Add:**
- Peak frequency and magnitude display
- Octave band toggle (show/hide 1/3 octave bars)
- Dominant frequency metric card

### 10. Spectrogram Viewer -- NEEDS MINOR ENHANCEMENT
Has colormap selector, which is good. Missing common controls.

**Add:**
- Dynamic range (dB) min/max sliders to adjust contrast
- FFT size selector (already imported `FFT_SIZES` but unused)

### 11. Audio Comparator -- NEEDS MINOR ENHANCEMENT
Side-by-side comparison with table is solid. Missing reset and difference highlighting.

**Add:**
- "Reset" / "Compare different files" button
- Delta column in comparison table showing the difference between A and B
- Color-coded cells (green when A is better, red when worse)

### 12. Batch Analyzer -- NEEDS MINOR ENHANCEMENT
Table with album averages is functional.

**Add:**
- CSV export button
- "Analyze more files" / reset button
- Sort by column (click headers)

---

## Implementation Plan

### Phase 1 -- LUFS Meter + DR Meter (highest impact)
1. **LUFS Meter**: Add a loudness history line chart rendering short-term LUFS values over time using a canvas element. Add a Momentary Max metric card.
2. **Dynamic Range Meter**: Add RMS Level card, a visual DR gauge bar, and context text comparing the DR score to known genres.

### Phase 2 -- Stereo Analyzer + Waveform Viewer
3. **Stereo Analyzer**: Add Side Energy card, a horizontal correlation meter bar (-1 to +1), L/R balance indicator, and recommendation text.
4. **Waveform Viewer**: Add peak level and duration info cards above the canvas, a channel selector for stereo files, and zoom +/- buttons.

### Phase 3 -- Spectrum + Spectrogram
5. **Spectrum Analyzer**: Add peak frequency display, octave band toggle, and dominant frequency card.
6. **Spectrogram Viewer**: Wire up FFT size selector and add min/max dB sliders for contrast adjustment.

### Phase 4 -- Comparator + Batch polish
7. **Audio Comparator**: Add reset button, delta column, and color-coded comparison cells.
8. **Batch Analyzer**: Add CSV export button, reset/add-more button.

---

## Technical Details

### Files to modify:
- `src/pages/tools/LufsMeter.tsx` -- add loudness history canvas component and momentary max card
- `src/pages/tools/DynamicRangeMeter.tsx` -- add RMS card, DR gauge, genre context
- `src/pages/tools/StereoAnalyzer.tsx` -- add correlation meter bar, side energy card, balance indicator
- `src/pages/tools/WaveformViewer.tsx` -- add info cards, channel selector, zoom controls
- `src/pages/tools/SpectrumAnalyzer.tsx` -- add peak freq display, octave toggle
- `src/pages/tools/SpectrogramViewer.tsx` -- wire FFT size selector, add dB range sliders
- `src/pages/tools/AudioComparator.tsx` -- add reset, delta column, color coding
- `src/pages/tools/BatchAnalyzer.tsx` -- add CSV export, reset button

### New components:
- `src/components/visualizations/LoudnessHistoryCanvas.tsx` -- line chart for LUFS short-term over time
- `src/components/visualizations/CorrelationMeter.tsx` -- horizontal -1 to +1 gauge
- `src/components/visualizations/DRGauge.tsx` -- horizontal DR score gauge with genre zones

### No new dependencies required
All visualizations will use HTML Canvas (consistent with existing pattern). No charting library needed.

