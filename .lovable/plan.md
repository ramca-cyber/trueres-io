

# Sidebar Redesign: Better Categories, Featured List, and Icon Coverage

## Problems Identified

1. Featured list has 6 original tools, missing high-engagement new tools (ABX Test, Crossfeed, Ear Training, Soundstage Test)
2. "Signal Generators and Testing" category has 15 tools -- too many, mixing unrelated tools
3. Headphone tools are scattered across "generators" and "processing" with no grouping
4. The `iconMap` in ToolNav.tsx is missing ~15 icons for new tools (they all render as a fallback Search icon)
5. Tool ordering within categories is arbitrary (insertion order)
6. No tool count badges on categories

---

## Changes

### 1. Add a new "Headphone" category

Split from generators. Move these 6 tools into a new `headphone` category:
- Crossfeed Simulator (currently in `processing`)
- Binaural Beats (currently in `generators`)
- Soundstage Test (currently in `generators`)
- Channel Balance (currently in `generators`)
- Ear Training (currently in `generators`)
- Headphone Guide (currently in `reference`)

New category definition:
- id: `headphone`
- label: "Headphone Tools"
- icon: Headphones
- color: text-purple-400

### 2. Updated category order (6 categories)

1. Audio Analysis and Forensics (14 tools)
2. Audio Processing (9 tools)
3. Video Processing (7 tools)
4. Signal Generators and Testing (9 tools, down from 15)
5. Headphone Tools (6 tools, new)
6. Reference and Education (7 tools, down from 8)

### 3. Updated Featured list (8 tools)

Replace the current 6 with a curated 8 that balances traffic drivers and new highlights:

1. Hi-Res Verifier (flagship tool)
2. LUFS Meter (professional standard)
3. Spectrogram (visual appeal)
4. ABX Test (audiophile engagement)
5. Audio Converter (utility workhorse)
6. Crossfeed Simulator (headphone highlight)
7. Video to MP3 (high search volume)
8. Ear Training (sticky/gamified)

### 4. Fix all missing icons in iconMap

Add these missing icon imports and mappings:
- `Brain` (Binaural Beats)
- `Compass` (Soundstage)
- `Scale` (Channel Balance)
- `Flame` (Burn-In)
- `Disc` (Turntable)
- `CircleDot` (Subwoofer)
- `Speaker` (Speaker Test)
- `LayoutGrid` (Surround Reference)
- `ArrowLeftRight` (dB Converter)
- `Clock` (Listening Monitor)
- `Shuffle` (ABX Test)
- `TriangleAlert` (Clipping Detector)
- `Mic` (Room Analyzer)
- `Binary` (Bit-Perfect)
- `Play` (Media Player)

### 5. Add tool count badges to category headers

Show the number of tools per category next to the label, e.g., "Audio Analysis (14)".

### 6. Sort tools alphabetically within each category

Currently tools appear in insertion order. Sorting alphabetically by `shortName` makes scanning faster.

---

## Technical Details

### Files Modified

**`src/types/tools.ts`**
- Add `'headphone'` to the `ToolCategory` union type
- Add the new category entry to `TOOL_CATEGORIES` array (position 5, before reference)

**`src/config/tool-registry.ts`**
- Change `category` field for 6 tools from their current categories to `'headphone'`
  - `crossfeed`: `processing` -> `headphone`
  - `binaural-beats`: `generators` -> `headphone`
  - `soundstage-test`: `generators` -> `headphone`
  - `channel-balance`: `generators` -> `headphone`
  - `ear-training`: `generators` -> `headphone`
  - `headphone-guide`: `reference` -> `headphone`

**`src/components/layout/ToolNav.tsx`**
- Update `FEATURED_IDS` array to the new 8-item list
- Add all 15 missing icons to the import statement and `iconMap`
- Add `Headphones` to `categoryIcons`
- Add tool count badge in the category trigger: `({tools.length})`
- Sort tools alphabetically before rendering: `tools.sort((a, b) => a.shortName.localeCompare(b.shortName))`

**`src/pages/Index.tsx`**
- The homepage "All Tools" grid reads from `TOOL_CATEGORIES` and `TOOLS` dynamically, so it will automatically pick up the new headphone category -- no changes needed there.
