# TrueRes.io — Implementation Plan

## Overview

This document details the step-by-step implementation order for all 35 tools and supporting infrastructure. Each step is designed to be implemented incrementally, with dependencies clearly noted.

---

## Phase 1: Foundation

### 1.1 Design System
- [ ] Update `index.css` with all CSS variables (dark theme, status colors)
- [ ] Update `tailwind.config.ts` with custom colors, fonts, spacing
- [ ] Add Google Fonts (Space Grotesk, Instrument Sans, JetBrains Mono) to `index.html`
- [ ] Create base component overrides (buttons, cards, badges with brand styling)

### 1.2 Types & Config
- [ ] Create `src/types/audio.ts` — AudioFileInfo, PCMData, DecodedAudio
- [ ] Create `src/types/tools.ts` — ToolDefinition, ToolCategory, EngineType
- [ ] Create `src/types/analysis.ts` — all analysis result interfaces
- [ ] Create `src/config/tool-registry.ts` — 35 tool definitions
- [ ] Create `src/config/browser-compat.ts` — capability detection utilities
- [ ] Create `src/config/constants.ts` — file size limits, supported formats, etc.

### 1.3 Layout Components
- [ ] `src/components/layout/Header.tsx` — logo, search, nav links
- [ ] `src/components/layout/Footer.tsx` — links, privacy message
- [ ] `src/components/layout/ToolNav.tsx` — sidebar nav by category
- [ ] `src/components/layout/MobileDrawer.tsx` — mobile navigation drawer
- [ ] `src/components/layout/AppShell.tsx` — combines header + nav + content + footer

### 1.4 Shared Components
- [ ] `src/components/shared/FileDropZone.tsx` — drag-drop with format validation
- [ ] `src/components/shared/FileInfoBar.tsx` — filename, format, duration, size
- [ ] `src/components/shared/ProgressBar.tsx` — decode/analysis progress
- [ ] `src/components/shared/ErrorBanner.tsx` — error display
- [ ] `src/components/shared/DownloadButton.tsx` — styled download button
- [ ] `src/components/shared/ToolPage.tsx` — standard tool page wrapper
- [ ] `src/components/shared/ToolHeader.tsx` — tool title + description + privacy badge
- [ ] `src/components/shared/BrowserCompatBanner.tsx` — compatibility warnings
- [ ] `src/components/shared/AdSlot.tsx` — ad placement wrapper
- [ ] `src/components/shared/CrossToolLinks.tsx` — "Also try" suggestions

### 1.5 Pages & Routing
- [ ] `src/pages/Index.tsx` — hero, tool grid, "why TrueRes" section
- [ ] `src/pages/AllTools.tsx` — searchable/filterable tool directory
- [ ] `src/pages/About.tsx` — how it works, privacy, tech details
- [ ] Update `src/App.tsx` — dynamic routing from tool registry with lazy imports

### 1.6 Hooks
- [ ] `src/hooks/use-browser-compat.ts` — detect capabilities, return warnings

---

## Phase 2: Analysis Engine

### 2.1 Stores
- [ ] `src/stores/audio-store.ts` — Zustand store for audio state + PCM cache
- [ ] `src/stores/app-store.ts` — Zustand store for UI state

### 2.2 Format Detection & Parsers
- [ ] `src/engines/analysis/decoders/format-detect.ts` — magic bytes detection
- [ ] `src/engines/analysis/parsers/wav-parser.ts`
- [ ] `src/engines/analysis/parsers/flac-parser.ts`
- [ ] `src/engines/analysis/parsers/mp3-parser.ts`
- [ ] `src/engines/analysis/parsers/aiff-parser.ts`
- [ ] `src/engines/analysis/parsers/ogg-parser.ts`
- [ ] `src/engines/analysis/parsers/mp4-parser.ts`
- [ ] `src/engines/analysis/parsers/id3-parser.ts`
- [ ] `src/engines/analysis/parsers/vorbis-comment-parser.ts`

### 2.3 Decoder Manager
- [ ] `src/engines/analysis/decoders/decoder-manager.ts` — tiered decoding (Web Audio → wasm → ffmpeg)

### 2.4 Analysis Modules
- [ ] `src/engines/analysis/modules/fft.ts` — Cooley-Tukey radix-2 FFT
- [ ] `src/engines/analysis/modules/windowing.ts` — Hann, Hamming, Blackman, Kaiser, Flat-top
- [ ] `src/engines/analysis/modules/spectrogram.ts` — 2D magnitude array
- [ ] `src/engines/analysis/modules/bit-depth.ts` — effective bit depth analysis
- [ ] `src/engines/analysis/modules/bandwidth.ts` — frequency ceiling detection
- [ ] `src/engines/analysis/modules/lossy-detect.ts` — spectral hole detection
- [ ] `src/engines/analysis/modules/lufs.ts` — ITU-R BS.1770-4 LUFS measurement
- [ ] `src/engines/analysis/modules/dynamic-range.ts` — DR score, crest factor
- [ ] `src/engines/analysis/modules/stereo.ts` — correlation, width, mid/side
- [ ] `src/engines/analysis/modules/waveform.ts` — multi-resolution envelopes
- [ ] `src/engines/analysis/modules/spectrum.ts` — frequency spectrum, octave bands
- [ ] `src/engines/analysis/modules/silence.ts` — silence detection
- [ ] `src/engines/analysis/modules/verdict.ts` — composite score

### 2.5 Signal Generators
- [ ] `src/engines/analysis/generators/tone.ts`
- [ ] `src/engines/analysis/generators/sweep.ts`
- [ ] `src/engines/analysis/generators/noise.ts`
- [ ] `src/engines/analysis/generators/wav-encoder.ts`

### 2.6 Workers
- [ ] `src/engines/analysis/workers/analysis.worker.ts`
- [ ] `src/engines/analysis/workers/worker-pool.ts`

### 2.7 Hooks
- [ ] `src/hooks/use-audio-file.ts` — file load + decode
- [ ] `src/hooks/use-analysis.ts` — run analysis with caching

---

## Phase 3: Processing Engine

- [ ] `src/engines/processing/ffmpeg-manager.ts` — lazy load, IndexedDB cache, init
- [ ] `src/engines/processing/presets.ts` — conversion/trim/normalize presets
- [ ] `src/engines/processing/ffmpeg.worker.ts` — worker isolation
- [ ] `src/stores/ffmpeg-store.ts` — Zustand ffmpeg state
- [ ] `src/hooks/use-ffmpeg.ts` — processing hook

---

## Phase 4: Visualizations

### 4.1 Core Visualizations
- [ ] `SpectrogramGL.tsx` — WebGL spectrogram
- [ ] `SpectrogramCanvas.tsx` — Canvas 2D fallback
- [ ] `WaveformCanvas.tsx` — multi-resolution waveform
- [ ] `SpectrumCanvas.tsx` — frequency spectrum
- [ ] `MeterBar.tsx` — vertical/horizontal level meter
- [ ] `GoniometerCanvas.tsx` — stereo X-Y plot
- [ ] `Gauge.tsx` — circular score gauge
- [ ] `TimeGraph.tsx` — time-series chart
- [ ] `Audiogram.tsx` — hearing test chart

### 4.2 Controls
- [ ] `ColorMapSelector.tsx`
- [ ] `FFTSizeSelector.tsx`
- [ ] `WindowSelector.tsx`
- [ ] `ChannelSelector.tsx`
- [ ] `ZoomControls.tsx`
- [ ] `PlaybackControls.tsx`
- [ ] `FormatSelector.tsx`
- [ ] `QualitySlider.tsx`
- [ ] `TrimHandles.tsx`

### 4.3 Display Components
- [ ] `MetricCard.tsx`
- [ ] `VerdictBanner.tsx`
- [ ] `ComplianceBadge.tsx`
- [ ] `FormatBadge.tsx`
- [ ] `TagTable.tsx`
- [ ] `CoverArt.tsx`
- [ ] `ReportCard.tsx`

---

## Phase 5: Tool Pages

### Build Order (by dependency)

**Batch 1 — No engine dependencies (static/math only)**
1. Bitrate Calculator `/bitrate-calculator`
2. Audio Format Reference `/format-reference`
3. Bluetooth Codec Comparison `/bluetooth-codecs`

**Batch 2 — Analysis engine, parsers only (no full decode needed)**
4. Audio File Inspector `/file-inspector`

**Batch 3 — Analysis engine, full decode + analysis**
5. Hi-Res Verifier `/hires-verifier`
6. Spectrogram Viewer `/spectrogram`
7. LUFS Meter `/lufs-meter`
8. Dynamic Range Meter `/dynamic-range`
9. Waveform Viewer `/waveform-viewer`
10. Stereo Analyzer `/stereo-analyzer`
11. Lossy Transcode Detector `/lossy-detector`
12. Spectrum Analyzer `/spectrum-analyzer`
13. Audio Comparator `/audio-compare`
14. Batch Album Analyzer `/batch-analyzer`
15. Frequency Response Plotter `/freq-response`

**Batch 4 — Signal generators (Web Audio oscillator/AudioWorklet)**
16. Tone Generator `/tone-generator`
17. Sweep Generator `/sweep-generator`
18. Noise Generator `/noise-generator`
19. Hearing Test `/hearing-test`
20. DAC & Headphone Test Suite `/dac-test`

**Batch 5 — Processing engine (ffmpeg.wasm)**
21. Audio Format Converter `/audio-converter`
22. Audio Trimmer `/audio-trimmer`
23. Audio Normalizer `/audio-normalizer`
24. Waveform Image Generator `/waveform-image`
25. Tag Viewer & Editor `/tag-editor`
26. Metadata Stripper `/metadata-stripper`
27. Sample Rate Converter `/sample-rate-converter`
28. Channel Operations `/channel-ops`

**Batch 6 — Video processing (ffmpeg.wasm, video support)**
29. Video to MP3 Extractor `/video-to-mp3`
30. Video Trimmer `/video-trimmer`
31. Video Compressor `/video-compressor`
32. Video to GIF Converter `/video-to-gif`
33. Video Format Converter `/video-converter`
34. Video Muter / Audio Replace `/video-mute`
35. Video to Audio Extractor `/video-to-audio`

---

## Phase 6: SEO & Polish

- [ ] Install `react-helmet-async`
- [ ] Add SEO component with per-tool title/description/OG tags
- [ ] Add JSON-LD schemas (WebApplication + FAQPage) per tool
- [ ] Create per-tool FAQ content
- [ ] Generate sitemap.xml
- [ ] Create OG images (1200×630) per tool
- [ ] Ad slot integration and positioning
- [ ] Affiliate link placements
- [ ] Performance audit (bundle size, code splitting verification)
- [ ] Responsive design audit across breakpoints
- [ ] Accessibility audit (ARIA labels, keyboard nav, screen reader)
- [ ] Memory management testing (large files, mobile)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge, mobile)

---

## Dependencies to Install

### Phase 1
- `zustand` — state management
- `react-helmet-async` — SEO meta tags
- `framer-motion` — animations

### Phase 2
- `wasm-audio-decoders` — fallback FLAC/MP3/OGG decoders (if needed)

### Phase 3
- `@ffmpeg/ffmpeg` — ffmpeg.wasm core
- `@ffmpeg/core` — ffmpeg WASM binary
- `@ffmpeg/util` — ffmpeg utilities

### Phase 4
- No additional dependencies (Canvas/WebGL are native)

---

## Success Metrics

- All 35 tools functional in Chrome 90+, Edge 90+, Firefox 90+
- Graceful degradation with clear messaging in Safari and mobile browsers
- Initial page load < 2s (shell + lazy tool)
- Lighthouse SEO score > 90 per tool page
- Zero server-side file processing
