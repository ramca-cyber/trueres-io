

# Comprehensive Tool Expansion for Audiophiles & Home Theater

Merging the 3 previously approved tools with new additions. Total: **12 new tools** (36 existing -> 48).

---

## Previously Approved (3 tools)

### 1. Speaker Channel Test (`/speaker-test`)
Category: generators | Engine: oscillator
Multichannel speaker identification with stereo and surround (5.1/7.1) modes using ChannelMergerNode. Visual speaker layout, polarity check.

### 2. Subwoofer & Bass Test (`/subwoofer-test`)
Category: generators | Engine: oscillator
Low-frequency steps (10-120Hz), continuous sweep, crossover finder, room mode detection hints.

### 3. Surround Sound Reference (`/surround-reference`)
Category: reference | Engine: none
Channel layouts (2.0 to 7.1.4), speaker placement angles, crossover recommendations, format comparison (Dolby/DTS/Atmos).

---

## New Additions (9 tools)

### 4. ABX Blind Test (`/abx-test`)
Category: analysis | Engine: analysis
**The** audiophile tool. Load two audio files (A and B), the tool randomly assigns one as X, user guesses. Tracks trials and computes statistical significance (p-value). Uses existing AudioPlayer and file decoding pipeline. Huge engagement potential.

### 5. Clipping & True Peak Detector (`/clipping-detector`)
Category: analysis | Engine: analysis
Dedicated tool to scan for inter-sample peaks (ISP), hard clipping, and consecutive clipped samples. Visual timeline showing where clips occur on the waveform. Uses existing PCM decoding + a new lightweight scan module.

### 6. Room / Mic Analyzer (`/room-analyzer`)
Category: generators | Engine: oscillator
Uses `getUserMedia()` to capture microphone input and pipes it through existing `spectrum.ts` and `spectrogram.ts` analysis in real-time. Shows live frequency response, noise floor measurement, and RT60 estimation. Useful for room acoustics and mic testing.

### 7. Headphone Burn-in Generator (`/burn-in-generator`)
Category: generators | Engine: oscillator
Controversial but massive traffic driver. Plays a curated sequence: pink noise, frequency sweeps, and dynamic content on a timer (1-24 hours). Uses existing noise and sweep generators. Simple loop scheduler. Includes a disclaimer about burn-in science.

### 8. Impulse Response Viewer (`/ir-viewer`)
Category: analysis | Engine: analysis
Load WAV impulse response files and visualize: time-domain waveform, frequency response (existing spectrum module), RT60 decay estimation, and waterfall spectrogram. Popular among home theater and headphone DSP users.

### 9. Turntable / Vinyl Test (`/turntable-test`)
Category: generators | Engine: oscillator
Generate test tones for turntable calibration: 3150Hz wow & flutter test tone, anti-skating bias tone (315Hz one-channel), speed accuracy tone (3150Hz for 33/45 RPM verification). Uses existing oscillator pattern.

### 10. dB Unit Converter (`/db-converter`)
Category: reference | Engine: none
Convert between dBFS, dBu, dBV, dBSPL, watts, and volts. Reference calculator for gain staging. Includes common reference levels (consumer -10dBV, pro +4dBu). Pure static computation, no audio engine.

### 11. Listening Fatigue Monitor (`/listening-monitor`)
Category: reference | Engine: none
A timer-based tool that estimates SPL exposure over time based on user-set listening level. Shows safe listening duration per WHO/NIOSH guidelines. Break reminders. Simple but sticky for daily use and health-conscious audiophiles.

### 12. Bit-Perfect Test (`/bit-perfect-test`)
Category: generators | Engine: oscillator
Generates a known 16-bit PCM test signal, user plays it through their chain and records back (or compares output). Verifies that no sample-rate conversion, volume adjustment, or DSP is applied by the OS/DAC. Uses existing WAV encoder for the reference file.

---

## Implementation Approach

### Files to Create (12 new pages)
- `src/pages/tools/SpeakerTest.tsx`
- `src/pages/tools/SubwooferTest.tsx`
- `src/pages/tools/SurroundReference.tsx`
- `src/pages/tools/ABXTest.tsx`
- `src/pages/tools/ClippingDetector.tsx`
- `src/pages/tools/RoomAnalyzer.tsx`
- `src/pages/tools/BurnInGenerator.tsx`
- `src/pages/tools/IRViewer.tsx`
- `src/pages/tools/TurntableTest.tsx`
- `src/pages/tools/DbConverter.tsx`
- `src/pages/tools/ListeningMonitor.tsx`
- `src/pages/tools/BitPerfectTest.tsx`

### New Engine Module
- `src/engines/analysis/modules/clipping.ts` -- inter-sample peak and clip detection scanner

### Files to Modify
- `src/config/tool-registry.ts` -- 12 new tool definitions
- `src/App.tsx` -- 12 lazy imports + routes
- `public/sitemap.xml` -- 12 new URLs
- `src/config/tool-faqs.ts` -- FAQ entries for new tools

### No New Dependencies
All tools use existing infrastructure:
- Web Audio API (`OscillatorNode`, `ChannelMergerNode`, `getUserMedia`)
- Existing analysis modules (`spectrum.ts`, `spectrogram.ts`, `waveform.ts`)
- Existing generators (`tone.ts`, `sweep.ts`, `noise.ts`, `wav-encoder.ts`)
- Existing UI components (`ToolPage`, `FileDropZone`, `MetricCard`, `Slider`, etc.)

### Build Order
Phase 1 (oscillator-based, simplest): Speaker Test, Subwoofer Test, Burn-in Generator, Turntable Test
Phase 2 (static/reference): Surround Reference, dB Converter, Listening Monitor
Phase 3 (analysis-based): ABX Test, Clipping Detector, IR Viewer, Room Analyzer, Bit-Perfect Test

