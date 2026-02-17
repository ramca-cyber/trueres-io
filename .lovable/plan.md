
# Headphone-Focused Tool Expansion

Add **6 new tools** specifically for headphone users and enthusiasts (48 existing -> 54 total).

---

## New Tools

### 1. Crossfeed Simulator (`/crossfeed`)
**Category:** processing | **Engine:** oscillator

The most requested headphone feature. Simulates speaker-like listening by blending a delayed, filtered portion of L into R and vice versa. Reduces the "inside your head" effect.

- Load any audio file via existing `FileDropZone`
- Adjustable crossfeed level (0-100%) and delay (0-600 microseconds)
- Three presets: Subtle, Natural, Wide (modeled on Meier/Jan Meier crossfeed)
- Uses `DelayNode` + `BiquadFilterNode` (lowpass) + `GainNode` per channel, routed through a `ChannelSplitterNode` / `ChannelMergerNode`
- Real-time toggle on/off for instant A/B comparison
- Playback via `AudioPlayer` component with the crossfeed chain inserted

### 2. Binaural Beat Generator (`/binaural-beats`)
**Category:** generators | **Engine:** oscillator

Extremely popular and simple to implement. Two `OscillatorNode`s at slightly different frequencies routed to L and R ears.

- Base frequency slider (100-500 Hz)
- Beat frequency selector (1-40 Hz) with labeled bands: Delta (1-4), Theta (4-8), Alpha (8-14), Beta (14-30), Gamma (30-40)
- Optional background noise layer (pink/brown noise from existing generator)
- Session timer (5-60 min)
- Volume control with safety limiter

### 3. Soundstage & Imaging Test (`/soundstage-test`)
**Category:** generators | **Engine:** oscillator

Test how well your headphones render spatial positioning.

- **Panning test:** Tone sweeps smoothly from hard-left to hard-right using `StereoPannerNode`
- **Center image test:** Mono tone to evaluate phantom center accuracy
- **Width test:** Correlated vs decorrelated noise to test perceived width
- **HRTF 3D test:** Uses Web Audio `PannerNode` with `panningModel: 'HRTF'` to position a tone at virtual positions around the listener (front, rear, above)
- Visual circle diagram showing current source position

### 4. Channel Balance / Driver Match Test (`/channel-balance`)
**Category:** generators | **Engine:** oscillator

Check if your headphone drivers are matched in volume and frequency response.

- Plays pink noise or tone alternating L/R rapidly (200ms intervals) to detect imbalance
- User adjustable balance slider to compensate and find the center
- Multi-frequency check: tests at 100Hz, 1kHz, 4kHz, 10kHz to catch frequency-dependent imbalance
- Reports perceived offset in dB
- Simple pass/fail per frequency band

### 5. EQ Ear Training (`/ear-training`)
**Category:** generators | **Engine:** oscillator

Learn to identify frequency bands by ear -- essential for mixing and critical listening.

- Plays pink noise or music (loaded via `FileDropZone`)
- Randomly boosts one frequency band by +6/+12 dB using `BiquadFilterNode` (peaking)
- User guesses which band was boosted from options (Sub, Bass, Low-Mid, Mid, Upper-Mid, Presence, Air)
- Tracks score across rounds
- Difficulty levels: Easy (3 bands), Medium (5 bands), Hard (8 bands, narrower Q)

### 6. Headphone Comparison Guide (`/headphone-guide`)
**Category:** reference | **Engine:** none

Static reference page for headphone enthusiasts.

- Headphone types explained: open-back, closed-back, planar magnetic, electrostatic, IEM
- Impedance and sensitivity guide (what needs an amp)
- DAC/amp pairing recommendations by impedance ranges
- Common target curves explained (Harman, Diffuse Field, Free Field)
- EQ tips for popular headphones

---

## Technical Details

### Files to Create (6)
- `src/pages/tools/CrossfeedSimulator.tsx`
- `src/pages/tools/BinauralBeats.tsx`
- `src/pages/tools/SoundstageTest.tsx`
- `src/pages/tools/ChannelBalance.tsx`
- `src/pages/tools/EarTraining.tsx`
- `src/pages/tools/HeadphoneGuide.tsx`

### Files to Modify
- `src/config/tool-registry.ts` -- 6 new tool definitions
- `src/App.tsx` -- 6 lazy imports + routes
- `public/sitemap.xml` -- 6 new URLs
- `src/config/tool-faqs.ts` -- FAQ entries for new tools

### No New Dependencies
All tools use existing Web Audio API nodes:
- `ChannelSplitterNode` / `ChannelMergerNode` (crossfeed)
- `StereoPannerNode` / `PannerNode` with HRTF (soundstage)
- `BiquadFilterNode` (crossfeed lowpass, ear training peaking EQ)
- `OscillatorNode` / `GainNode` (binaural beats, channel balance)
- Existing `FileDropZone`, `AudioPlayer`, `ToolPage`, `Slider`, `Button` components

### Crossfeed Audio Graph
```text
FileSource -> ChannelSplitter(2)
  Splitter[0] (L) -> LowpassFilter -> DelayNode -> CrossfeedGain -> Merger[1] (R)
  Splitter[1] (R) -> LowpassFilter -> DelayNode -> CrossfeedGain -> Merger[0] (L)
  Splitter[0] (L) -> DirectGain -> Merger[0] (L)
  Splitter[1] (R) -> DirectGain -> Merger[1] (R)
Merger -> Destination
```

### Build Order
1. Binaural Beats, Channel Balance (simplest oscillator patterns)
2. Soundstage Test (StereoPanner + HRTF PannerNode)
3. Crossfeed Simulator (most complex audio graph)
4. Ear Training (needs file loading + random EQ)
5. Headphone Guide (static content, fastest to write)
