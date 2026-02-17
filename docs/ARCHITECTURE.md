# TrueRes.io — Architecture & Vision Document

## Vision

TrueRes.io is a **free, privacy-first, browser-based** audio and video tools platform. All processing happens client-side — no files are ever uploaded to any server.

**Tagline:** "No uploads. No servers. 100% browser."

---

## Core Principles

1. **Privacy First** — Zero server uploads. All decoding, analysis, and processing in-browser.
2. **Browser-Native** — Web Audio API, Canvas/WebGL, ffmpeg.wasm, Web Workers.
3. **SEO-Driven Growth** — 36 dedicated tool pages, each an SEO landing page.
4. **Monetization** — Ad-supported (banner/sidebar/interstitial slots) + affiliate links.
5. **Progressive Enhancement** — Graceful degradation with browser capability detection.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui components |
| State | Zustand (AudioStore, FFmpegStore, AppStore, MiniPlayerStore, FileTransferStore) |
| Analysis Engine | Web Audio API + custom JS analyzers |
| Processing Engine | ffmpeg.wasm (@ffmpeg/ffmpeg + @ffmpeg/core) |
| Visualization | Canvas 2D (spectrogram, waveform, spectrum, meters) |
| Routing | React Router v6, lazy-loaded per tool |
| SEO | react-helmet-async, JSON-LD (WebApplication + FAQPage schemas), dynamic sitemap |
| Animations | Framer Motion |

---

## Design System

### Colors (HSL)

| Token | Value | Usage |
|---|---|---|
| `--background` | `0 0% 4%` (#0a0a0a) | Page background |
| `--card` | `0 0% 7%` (#111111) | Card/panel background |
| `--card-elevated` | `0 0% 10%` (#1a1a1a) | Elevated cards, hover states |
| `--foreground` | `0 0% 95%` (#f2f2f2) | Primary text |
| `--muted-foreground` | `0 0% 64%` (#a3a3a3) | Secondary text |
| `--primary` | `30 83% 63%` (#f0a050) | Brand amber — CTAs, highlights |
| `--primary-foreground` | `0 0% 4%` | Text on primary |
| `--accent` | `18 75% 53%` (#e06030) | Hover/active brand accent |
| `--destructive` | `0 84% 60%` | Errors, fail states |
| `--border` | `0 0% 15%` | Borders |
| `--ring` | `30 83% 63%` | Focus ring (matches primary) |
| `--status-pass` | `142 71% 45%` (#22c55e) | Pass/good indicators |
| `--status-warn` | `45 93% 47%` (#eab308) | Warning indicators |
| `--status-fail` | `0 84% 60%` (#ef4444) | Fail/bad indicators |
| `--status-info` | `217 91% 60%` (#3b82f6) | Info indicators |

### Typography

| Role | Font | Tailwind Class |
|---|---|---|
| Headings | Space Grotesk | `font-heading` |
| Body | Instrument Sans | `font-body` |
| Mono/Data | JetBrains Mono | `font-mono` |

---

## Browser Compatibility

### Supported Browsers (Full)
- Chrome 90+ (desktop & Android)
- Edge 90+
- Firefox 90+

### Partial Support
- Safari 15.4+ — No SharedArrayBuffer without COOP/COEP headers; no native FLAC decoding in Web Audio API
- Mobile Safari (iOS) — Memory limited (~300MB), ffmpeg.wasm may fail on large files
- Mobile Chrome/Firefox — Works but memory-constrained

### Compatibility Strategy
- **Capability detection on app load** — detect SharedArrayBuffer, WebGL, Web Workers, WASM support
- **Per-tool compatibility badges** — show warnings if a tool won't work in the current browser
- **`BrowserCompatBanner.tsx`** — persistent banner for unsupported/partial browsers
- **Graceful fallbacks** — Canvas 2D when WebGL unavailable, single-threaded when Workers unavailable
- **File size limits** — warn at 200MB, hard limit at 500MB on mobile

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      App Shell                          │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐            │
│  │  Header  │  │ Tool Nav │  │   Footer   │            │
│  └─────────┘  └──────────┘  └────────────┘            │
├─────────────────────────────────────────────────────────┤
│                   Tool Pages (36)                       │
│  ┌───────────────────────────────────────────────────┐ │
│  │  FileDropZone → Decode → Analyze → Visualize     │ │
│  │       ↓            ↓         ↓          ↓         │ │
│  │  FileInfoBar   AudioStore  Cache    Canvas 2D     │ │
│  └───────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                    Engine Layer                         │
│  ┌─────────────────┐    ┌──────────────────┐          │
│  │ Analysis Engine  │    │ Processing Engine │          │
│  │ (Web Audio API)  │    │  (ffmpeg.wasm)    │          │
│  │                  │    │                   │          │
│  │ • Header Parsers │    │ • Format Convert  │          │
│  │ • FFT/Spectrum   │    │ • Trim/Normalize  │          │
│  │ • LUFS/DR        │    │ • Video→Audio     │          │
│  │ • Bit Depth      │    │ • Video Compress  │          │
│  │ • Lossy Detect   │    │ • GIF/WebM        │          │
│  └─────────────────┘    └──────────────────┘          │
├─────────────────────────────────────────────────────────┤
│                   Storage Layer                         │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │   Zustand     │  │  IndexedDB   │                    │
│  │  AudioStore   │  │  WASM Cache  │                    │
│  │  FFmpegStore  │  │              │                    │
│  │  AppStore     │  │              │                    │
│  │  MiniPlayer   │  │              │                    │
│  │  FileTransfer │  │              │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

---

## Tool Registry (36 Tools)

### Category 1: Audio Analysis & Forensics (12 tools)

| # | Tool | Route | Engine | Key Analyses |
|---|---|---|---|---|
| 1 | Hi-Res Verifier | `/hires-verifier` | Analysis | bitDepth, bandwidth, lossy, DR, verdict |
| 2 | Spectrogram Viewer | `/spectrogram` | Analysis | spectrogram (Canvas 2D) |
| 3 | LUFS Meter | `/lufs-meter` | Analysis | LUFS (integrated/short/momentary), true peak, LRA |
| 4 | Dynamic Range Meter | `/dynamic-range` | Analysis | DR score, crest factor, peak/RMS, clipping |
| 5 | Waveform Viewer | `/waveform-viewer` | Analysis | waveform envelope (multi-resolution) |
| 6 | Stereo Analyzer | `/stereo-analyzer` | Analysis | correlation, width, mid/side, goniometer |
| 7 | Audio File Inspector | `/file-inspector` | Analysis | header parse, metadata, format details |
| 8 | Lossy Transcode Detector | `/lossy-detector` | Analysis | spectral holes, encoder fingerprint |
| 9 | Spectrum Analyzer | `/spectrum-analyzer` | Analysis | frequency spectrum, 1/3 octave, weighting |
| 10 | Audio Comparator | `/audio-compare` | Analysis | dual-file side-by-side comparison |
| 11 | Batch Album Analyzer | `/batch-analyzer` | Analysis | multi-file DR/loudness table |
| 12 | Frequency Response Plotter | `/freq-response` | Analysis | frequency response curve |

### Category 2: Audio Processing & Conversion (8 tools)

| # | Tool | Route | Engine | Description |
|---|---|---|---|---|
| 13 | Audio Format Converter | `/audio-converter` | ffmpeg | Convert between audio formats |
| 14 | Audio Trimmer | `/audio-trimmer` | ffmpeg | Trim audio with waveform handles |
| 15 | Audio Normalizer | `/audio-normalizer` | ffmpeg | Normalize to target LUFS |
| 16 | Waveform Image Generator | `/waveform-image` | Analysis | Render waveform to PNG |
| 17 | Tag Viewer & Editor | `/tag-editor` | Analysis + ffmpeg | View/edit ID3/Vorbis tags |
| 18 | Metadata Stripper | `/metadata-stripper` | ffmpeg | Remove all metadata |
| 19 | Sample Rate Converter | `/sample-rate-converter` | ffmpeg | Resample audio |
| 20 | Channel Operations | `/channel-ops` | ffmpeg | Extract/merge channels |

### Category 3: Video Processing (7 tools)

| # | Tool | Route | Engine | Description |
|---|---|---|---|---|
| 21 | Video to MP3 Extractor | `/video-to-mp3` | ffmpeg | Extract audio as MP3 |
| 22 | Video Trimmer | `/video-trimmer` | ffmpeg | Trim video with time inputs |
| 23 | Video Compressor | `/video-compressor` | ffmpeg | Compress with CRF control |
| 24 | Video to GIF Converter | `/video-to-gif` | ffmpeg | Convert video to GIF |
| 25 | Video Format Converter | `/video-converter` | ffmpeg | Convert between video formats |
| 26 | Video Muter / Audio Replace | `/video-mute` | ffmpeg | Remove/replace audio track |
| 27 | Video to Audio Extractor | `/video-to-audio` | ffmpeg | Extract audio in original codec |

### Category 4: Signal Generators & Testing (5 tools)

| # | Tool | Route | Engine | Description |
|---|---|---|---|---|
| 28 | Tone Generator | `/tone-generator` | Analysis (oscillator) | Generate sine/square/triangle/saw tones |
| 29 | Sweep Generator | `/sweep-generator` | Analysis (oscillator) | Generate frequency sweeps |
| 30 | Noise Generator | `/noise-generator` | Analysis (AudioWorklet) | Generate colored noise |
| 31 | Hearing Test | `/hearing-test` | Analysis (oscillator) | Audiometric hearing test |
| 32 | DAC & Headphone Test Suite | `/dac-test` | Analysis (oscillator) | Channel/frequency/DR tests |

### Category 5: Reference & Education (4 tools)

| # | Tool | Route | Engine | Description |
|---|---|---|---|---|
| 33 | Audio Bitrate Calculator | `/bitrate-calculator` | None (pure math) | Calculate file sizes |
| 34 | Audio Format Reference | `/format-reference` | None (static) | Format comparison guide |
| 35 | Bluetooth Codec Comparison | `/bluetooth-codecs` | None (static) | Codec comparison guide |
| 36 | Media Player | `/media-player` | ffmpeg (transcode) + Web Audio | Universal audio/video player with EQ, crossfade, gapless, A-B loop |

---

## Media Player Features

The Universal Media Player (tool #36) is a full-featured playback tool with:

- **Multi-file queue** with drag-to-reorder, shuffle, and loop modes (off/one/all)
- **Auto-transcode** for unsupported formats (MKV, AVI, WMA → browser-playable)
- **3-band parametric EQ** (Bass/Mid/Treble ±12dB) via Web Audio API
- **Playback speed** control (0.5x–2x)
- **Crossfade** between tracks (0–5s configurable)
- **Gapless playback** via pre-buffering next track
- **A-B loop** region with precise time markers
- **Interactive waveform seekbar** with decoded peak visualization
- **Live spectrum** (frequency bars) and **scrolling spectrogram** visualizations
- **Metadata display** with cover art extraction (ID3, Vorbis Comments)
- **Sleep timer** (15m/30m/60m/end-of-track)
- **Audio-only mode** for video files (strips video track via ffmpeg)
- **Mini-player** with persistent playback across navigation
- **Keyboard shortcuts**: Space (play/pause), N (next), P (previous)
- **.m3u playlist export**

---

## File Structure

```
src/
├── assets/                     # Images, fonts, static assets
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/                 # AppShell, Header, Footer, ToolNav
│   │   ├── AppShell.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── ToolNav.tsx
│   ├── shared/                 # Shared tool components
│   │   ├── FileDropZone.tsx
│   │   ├── FileInfoBar.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── DownloadButton.tsx
│   │   ├── ToolPage.tsx        # Standard tool page wrapper (SEO, FAQ, cross-links)
│   │   ├── ToolActionGrid.tsx  # Cross-tool quick actions
│   │   ├── BrowserCompatBanner.tsx
│   │   ├── CrossToolLinks.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── AudioPlayer.tsx     # Web Audio player with EQ + speed + volume
│   │   ├── VideoPlayer.tsx
│   │   ├── MiniPlayer.tsx      # Persistent mini-player bar
│   │   ├── PlaylistPanel.tsx   # Drag-reorder queue
│   │   ├── MetadataDisplay.tsx # ID3/Vorbis tag + cover art display
│   │   ├── WaveformSeekbar.tsx # Decoded waveform with click-to-seek
│   │   ├── LiveSpectrum.tsx    # Real-time frequency bars
│   │   ├── LiveSpectrogram.tsx # Scrolling frequency heatmap
│   │   ├── ABLoopControls.tsx  # A-B loop region controls
│   │   └── InteractiveWaveform.tsx
│   ├── visualizations/         # Canvas components
│   │   ├── SpectrogramCanvas.tsx
│   │   ├── WaveformCanvas.tsx
│   │   ├── SpectrumCanvas.tsx
│   │   ├── LoudnessHistoryCanvas.tsx
│   │   ├── CorrelationMeter.tsx
│   │   └── DRGauge.tsx
│   └── display/                # Data display components
│       ├── MetricCard.tsx
│       ├── VerdictBanner.tsx
│       └── ComplianceBadge.tsx
├── engines/
│   ├── analysis/               # Analysis engine
│   │   ├── decoders/
│   │   │   ├── decoder-manager.ts
│   │   │   └── format-detect.ts
│   │   ├── parsers/
│   │   │   ├── wav-parser.ts
│   │   │   ├── flac-parser.ts
│   │   │   ├── aiff-parser.ts
│   │   │   ├── mp3-parser.ts
│   │   │   ├── ogg-parser.ts
│   │   │   ├── mp4-parser.ts
│   │   │   ├── id3-parser.ts
│   │   │   └── vorbis-comment-parser.ts
│   │   ├── modules/
│   │   │   ├── fft.ts
│   │   │   ├── windowing.ts
│   │   │   ├── spectrogram.ts
│   │   │   ├── bit-depth.ts
│   │   │   ├── bandwidth.ts
│   │   │   ├── lossy-detect.ts
│   │   │   ├── lufs.ts
│   │   │   ├── dynamic-range.ts
│   │   │   ├── stereo.ts
│   │   │   ├── waveform.ts
│   │   │   ├── spectrum.ts
│   │   │   ├── silence.ts
│   │   │   └── verdict.ts
│   │   └── generators/
│   │       ├── tone.ts
│   │       ├── sweep.ts
│   │       ├── noise.ts
│   │       └── wav-encoder.ts
│   └── processing/             # Processing engine (ffmpeg.wasm)
│       ├── ffmpeg-manager.ts
│       └── presets.ts
├── stores/
│   ├── audio-store.ts
│   ├── ffmpeg-store.ts
│   ├── app-store.ts
│   ├── mini-player-store.ts
│   └── file-transfer-store.ts
├── config/
│   ├── tool-registry.ts        # All 36 tool definitions
│   ├── tool-faqs.ts            # Per-tool FAQ content for SEO
│   ├── browser-compat.ts       # Browser capability detection
│   └── constants.ts            # Shared constants
├── pages/
│   ├── Index.tsx               # Home page (dynamic tool count)
│   ├── AllTools.tsx            # Tool directory with search & filter
│   ├── About.tsx               # About page
│   ├── NotFound.tsx            # 404
│   └── tools/                  # 36 tool pages
│       ├── HiResVerifier.tsx
│       ├── SpectrogramViewer.tsx
│       ├── LufsMeter.tsx
│       ├── DynamicRangeMeter.tsx
│       ├── WaveformViewer.tsx
│       ├── StereoAnalyzer.tsx
│       ├── FileInspector.tsx
│       ├── LossyDetector.tsx
│       ├── SpectrumAnalyzer.tsx
│       ├── AudioComparator.tsx
│       ├── BatchAnalyzer.tsx
│       ├── FreqResponse.tsx
│       ├── AudioConverter.tsx
│       ├── AudioTrimmer.tsx
│       ├── AudioNormalizer.tsx
│       ├── WaveformImage.tsx
│       ├── TagEditor.tsx
│       ├── MetadataStripper.tsx
│       ├── SampleRateConverter.tsx
│       ├── ChannelOps.tsx
│       ├── VideoToMp3.tsx
│       ├── VideoTrimmer.tsx
│       ├── VideoCompressor.tsx
│       ├── VideoToGif.tsx
│       ├── VideoConverter.tsx
│       ├── VideoMute.tsx
│       ├── VideoToAudio.tsx
│       ├── ToneGenerator.tsx
│       ├── SweepGenerator.tsx
│       ├── NoiseGenerator.tsx
│       ├── HearingTest.tsx
│       ├── DacTest.tsx
│       ├── BitrateCalculator.tsx
│       ├── FormatReference.tsx
│       ├── BluetoothCodecs.tsx
│       └── MediaPlayer.tsx
├── hooks/
│   ├── use-audio-file.ts
│   ├── use-analysis.ts
│   ├── use-audio-preview.ts
│   ├── use-ffmpeg.ts
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/
│   └── utils.ts                # cn(), formatTime(), formatTimePrecise()
├── types/
│   ├── audio.ts
│   ├── tools.ts
│   └── analysis.ts
├── App.tsx
├── App.css
├── index.css
├── main.tsx
└── vite-env.d.ts
```

---

## SEO Strategy

### Per-Tool SEO
- **Helmet** meta tags: `<title>`, `<meta name="description">`, OG tags, canonical URL
- **JSON-LD schemas**: `WebApplication` (per tool) + `FAQPage` (for tools with FAQ content)
- **FAQ sections**: Rendered in DOM for crawlers, also structured as JSON-LD
- **Dynamic tool count**: Homepage and AllTools page use `TOOLS.length` (currently 36)

### Site-Level SEO
- `sitemap.xml` — all 36 tool routes + homepage + tools directory + about page
- `robots.txt` — allows all crawlers, references sitemap
- `index.html` — base OG/Twitter Card meta tags, canonical URL
- Organization + WebSite JSON-LD schemas on homepage

### Keyword Targeting
Each tool has a unique set of `keywords` in the tool registry, plus a dedicated `metaDescription` optimized for search. FAQ content targets long-tail conversational queries.

---

## Implementation Phases

All phases are complete:

### Phase 1: Foundation ✅
- Design tokens, fonts, AppShell, Header, Footer, ToolNav
- Tool registry with 36 tool definitions + dynamic lazy routing
- FileDropZone, ToolPage wrapper, BrowserCompatBanner
- Home page, All Tools page, About page

### Phase 2: Analysis Engine ✅
- Header parsers (WAV, FLAC, MP3, AIFF, OGG, MP4)
- Decoder manager (Web Audio API fallback chain)
- Zustand AudioStore
- Core analysis modules (FFT, LUFS, DR, bit-depth, bandwidth, lossy-detect, stereo, waveform, spectrum)
- Signal generators (tone, sweep, noise)

### Phase 3: Processing Engine ✅
- ffmpeg.wasm integration with IndexedDB caching
- Zustand FFmpegStore
- Processing presets (convert, trim, normalize, extract)
- Progress reporting

### Phase 4: Visualizations ✅
- Canvas 2D spectrogram
- Waveform renderer (multi-resolution)
- Spectrum display (bar/line)
- LUFS/peak meters, DR gauge
- Correlation meter (stereo)

### Phase 5: Tool Pages (36 tools) ✅
- All tool pages built with shared components + engine hooks
- Per-tool SEO metadata + JSON-LD
- Per-tool FAQ sections (13 tools)
- Cross-tool link suggestions

### Phase 6: Media Player ✅
- Universal audio/video player with queue management
- Web Audio EQ, crossfade, gapless playback
- A-B loop, live visualizations, waveform seekbar
- Mini-player, sleep timer, audio-only mode
- Keyboard shortcuts, .m3u export

### Phase 7: Audit & Polish ✅
- Memory leak fixes (MetadataDisplay, AudioContext cleanup)
- Performance optimizations (ResizeObserver, event-driven rAF)
- Accessibility (aria-labels, Radix Popover, canvas roles)
- Shared utilities (formatTime extracted to lib/utils)

---

## Known Limitations & Mitigations

| Limitation | Affected Browsers | Mitigation |
|---|---|---|
| No SharedArrayBuffer | Safari < 16.4, some mobile | Single-threaded ffmpeg fallback, warning banner |
| No native FLAC decode | Safari | wasm-audio-decoders fallback |
| Memory limits (~300MB) | All mobile browsers | File size warnings, hard limits |
| WebGL unavailable | Older mobile, some Linux | Canvas 2D spectrogram fallback |
| ffmpeg.wasm ~25MB download | All (first load) | IndexedDB cache, progress UI, size warning |
| Large video processing | Mobile, low-RAM devices | File size limits, memory monitoring |

---

## Monetization Strategy

- **Display Ads**: Banner (top/bottom), sidebar (desktop), interstitial (during processing wait)
- **Affiliate Links**: DAC/headphone recommendations, music store links
- **Future**: Premium tier for batch processing, higher file limits, no ads
