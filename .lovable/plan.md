

# Fix: Invisible Spectrum Bars + Missing Metadata

## Issue 1: Live Spectrum Bars Not Visible

**Root cause**: The Canvas 2D `fillStyle` property does not support modern space-separated HSL syntax. The code reads `--primary` as `30 83% 63%` and produces `hsla(30 83% 63%, 0.7)` -- which Canvas silently ignores, drawing nothing.

**Fix** in `src/components/shared/LiveSpectrum.tsx`:
- Replace the HSL string with a comma-separated format: `hsla(30, 83%, 63%, 0.7)`
- Parse the `--primary` value and insert commas, or split the space-separated values

```
// Before
ctx.fillStyle = `hsla(${primaryHSL}, ${alpha})`;

// After - split "30 83% 63%" into "30, 83%, 63%"
const [h, s, l] = primaryHSL.split(' ');
...
ctx.fillStyle = `hsla(${h}, ${s}, ${l}, ${alpha})`;
```

---

## Issue 2: No Album Art / Metadata for Some Formats

**Root cause**: `MetadataDisplay.extractMetadata()` only handles mp3 (ID3), flac, ogg, and opus. Common formats like `.m4a`, `.wav`, `.aac`, `.aiff`, `.weba` have no metadata extraction, so the component returns null and shows nothing.

**Fix** in `src/components/shared/MetadataDisplay.tsx`:
- Add M4A/MP4 metadata extraction using the existing `mp4-parser.ts` (check if it exposes metadata)
- Add WAV metadata extraction (WAV can have LIST/INFO chunks with title/artist)
- Add AIFF metadata extraction using the existing `aiff-parser.ts`
- For formats with no metadata support, show a fallback display with the filename instead of hiding the component entirely

**Fallback behavior**: When no metadata can be extracted, still show the file name and a generic music icon so the "now playing" area is never empty for audio tracks.

---

## Files to Change

1. **`src/components/shared/LiveSpectrum.tsx`** -- Fix HSL color format for canvas fillStyle
2. **`src/components/shared/MetadataDisplay.tsx`** -- Add format support and fallback display

