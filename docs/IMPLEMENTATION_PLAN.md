# TrueRes.io — Implementation Plan

## Overview

This document details the step-by-step implementation order for all 36 tools and supporting infrastructure. All phases are now complete.

---

## Phase 1: Foundation ✅

### 1.1 Design System ✅
- [x] Update `index.css` with all CSS variables (dark theme, status colors)
- [x] Update `tailwind.config.ts` with custom colors, fonts, spacing
- [x] Add Google Fonts (Space Grotesk, Instrument Sans, JetBrains Mono) to `index.html`
- [x] Create base component overrides (buttons, cards, badges with brand styling)

### 1.2 Types & Config ✅
- [x] Create `src/types/audio.ts` — AudioFileInfo, PCMData, DecodedAudio
- [x] Create `src/types/tools.ts` — ToolDefinition, ToolCategory, EngineType
- [x] Create `src/types/analysis.ts` — all analysis result interfaces
- [x] Create `src/config/tool-registry.ts` — 36 tool definitions
- [x] Create `src/config/tool-faqs.ts` — per-tool FAQ content for SEO
- [x] Create `src/config/browser-compat.ts` — capability detection utilities
- [x] Create `src/config/constants.ts` — file size limits, supported formats, etc.

### 1.3 Layout Components ✅
- [x] `src/components/layout/Header.tsx` — logo, nav links
- [x] `src/components/layout/Footer.tsx` — links, privacy message
- [x] `src/components/layout/ToolNav.tsx` — sidebar nav by category
- [x] `src/components/layout/AppShell.tsx` — combines header + nav + content + footer

### 1.4 Shared Components ✅
- [x] `src/components/shared/FileDropZone.tsx` — drag-drop with format validation
- [x] `src/components/shared/FileInfoBar.tsx` — filename, format, duration, size
- [x] `src/components/shared/ProgressBar.tsx` — decode/analysis progress
- [x] `src/components/shared/ErrorBoundary.tsx` — error boundary wrapper
- [x] `src/components/shared/DownloadButton.tsx` — styled download button
- [x] `src/components/shared/ToolPage.tsx` — standard tool page wrapper (SEO, FAQ, cross-links)
- [x] `src/components/shared/BrowserCompatBanner.tsx` — compatibility warnings
- [x] `src/components/shared/CrossToolLinks.tsx` — "Also try" suggestions
- [x] `src/components/shared/ToolActionGrid.tsx` — cross-tool quick actions

### 1.5 Pages & Routing ✅
- [x] `src/pages/Index.tsx` — hero, tool grid, "why TrueRes" section (dynamic tool count)
- [x] `src/pages/AllTools.tsx` — searchable/filterable tool directory
- [x] `src/pages/About.tsx` — how it works, privacy, tech details
- [x] Update `src/App.tsx` — dynamic routing from tool registry with lazy imports

### 1.6 Hooks ✅
- [x] `src/hooks/use-audio-file.ts` — file load + decode
- [x] `src/hooks/use-analysis.ts` — run analysis with caching
- [x] `src/hooks/use-ffmpeg.ts` — ffmpeg processing hook
- [x] `src/hooks/use-audio-preview.ts` — audio preview playback
- [x] `src/hooks/use-mobile.tsx` — mobile detection

---

## Phase 2: Analysis Engine ✅

### 2.1 Stores ✅
- [x] `src/stores/audio-store.ts` — Zustand store for audio state + PCM cache
- [x] `src/stores/app-store.ts` — Zustand store for UI state
- [x] `src/stores/ffmpeg-store.ts` — Zustand ffmpeg state
- [x] `src/stores/mini-player-store.ts` — Mini-player persistent state
- [x] `src/stores/file-transfer-store.ts` — Cross-tool file transfer

### 2.2 Format Detection & Parsers ✅
- [x] All 8 parsers (WAV, FLAC, MP3, AIFF, OGG, MP4, ID3, Vorbis Comments)
- [x] `format-detect.ts` — magic bytes detection
- [x] `decoder-manager.ts` — tiered decoding

### 2.3 Analysis Modules ✅
- [x] All 13 modules (FFT, windowing, spectrogram, bit-depth, bandwidth, lossy-detect, LUFS, DR, stereo, waveform, spectrum, silence, verdict)

### 2.4 Signal Generators ✅
- [x] tone.ts, sweep.ts, noise.ts, wav-encoder.ts

---

## Phase 3: Processing Engine ✅
- [x] ffmpeg-manager.ts, presets.ts, use-ffmpeg.ts

---

## Phase 4: Visualizations ✅
- [x] SpectrogramCanvas, WaveformCanvas, SpectrumCanvas, LoudnessHistoryCanvas, CorrelationMeter, DRGauge
- [x] MetricCard, VerdictBanner, ComplianceBadge

---

## Phase 5: Tool Pages (36 tools) ✅
All 36 tools built: 12 analysis + 8 processing + 7 video + 5 generators + 4 reference (incl. Media Player)

---

## Phase 6: SEO & Polish ✅
- [x] react-helmet-async, JSON-LD, per-tool FAQs, sitemap.xml, robots.txt
- [x] Dynamic tool counts, canonical URLs, OG tags
- [x] Accessibility (aria-labels, canvas roles, Radix Popovers)
- [x] Performance (ResizeObserver, event-driven rAF, memoized deps)
- [x] Memory management (object URL lifecycle, AudioContext cleanup)

---

## Phase 7: Audit Fixes ✅
- [x] MetadataDisplay cover art leak, AudioContext cleanup, crossfade deps
- [x] Pre-buffer stabilization, WaveformSeekbar event-driven rAF
- [x] LiveSpectrum ResizeObserver, shared formatTime utility
- [x] NotFound consistent styling, Radix Popover migration

---

## Success Metrics
- All 36 tools functional in Chrome 90+, Edge 90+, Firefox 90+
- Graceful degradation in Safari and mobile
- Initial page load < 2s
- Lighthouse SEO score > 90 per tool page
- Zero server-side file processing
