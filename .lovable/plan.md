

# Collapsible Categories + Featured Section in Tool Nav

## Overview

Redesign the sidebar navigation to have two distinct sections:

1. **Featured** -- A pinned section at the top highlighting the Media Player and a curated set of the most popular tools, giving them prime visibility.
2. **All Tools** -- The full category listing, but with each category collapsible (using Radix Collapsible). Categories auto-expand if the active route is inside them, and stay collapsed otherwise to reduce visual clutter.

## Design

```text
+------------------------------+
|  FEATURED                    |
|    > Player                  |
|    > Spectrogram             |
|    > LUFS Meter              |
|    > Converter               |
|    > Video to MP3            |
+------------------------------+
|  AUDIO ANALYSIS        [v]  |
|    > Hi-Res Verifier         |
|    > Spectrogram             |
|    > ...                     |
+------------------------------+
|  AUDIO PROCESSING      [>]  |  <- collapsed
+------------------------------+
|  VIDEO PROCESSING      [>]  |  <- collapsed
+------------------------------+
|  GENERATORS            [>]  |  <- collapsed
+------------------------------+
|  REFERENCE             [>]  |  <- collapsed
+------------------------------+
```

## Details

### Featured Section

- Defined as a simple array of tool IDs in `ToolNav.tsx` (no registry changes needed):
  ```
  const FEATURED_IDS = [
    'media-player',
    'spectrogram-viewer',
    'lufs-meter',
    'audio-converter',
    'video-to-mp3',
    'hi-res-verifier',
  ];
  ```
- Rendered as a separate block at the top with a star icon and "Featured" label
- Same link styling as the rest of the nav -- just a curated shortcut list
- Tools appearing in Featured also still appear in their category below (no duplication issues since it's just navigation links)

### Collapsible Categories

- Use the existing `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@radix-ui/react-collapsible` (already installed)
- Each category header becomes a clickable trigger with a chevron indicator that rotates on open
- **Auto-expand logic**: A category is open by default if the current route matches any tool within it. Otherwise it starts collapsed.
- Users can manually toggle any category open/closed
- State is local to the component (no persistence needed -- it resets on navigation which is fine since the active category auto-opens)

### Chevron Animation

- Use the `ChevronRight` icon from lucide-react
- Rotate 90 degrees when open via a CSS transition: `transition-transform duration-200` + conditional `rotate-90`

## Technical Details

### File to modify

**`src/components/layout/ToolNav.tsx`** -- the only file that changes.

### Implementation

1. Add imports: `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`, plus `Star` and `ChevronRight` from lucide-react
2. Define `FEATURED_IDS` array at top of file
3. Render Featured section before the category loop:
   - Filter `TOOLS` by the featured IDs, preserving the array order
   - Render with the same link item pattern
4. Replace each category `<div>` with a `<Collapsible>` wrapper:
   - `defaultOpen` set to `true` if any tool in that category matches `location.pathname`
   - Category header becomes `<CollapsibleTrigger>` with chevron
   - Tool list wrapped in `<CollapsibleContent>`
5. Add a subtle visual separator between Featured and All Tools sections (a simple `<div className="border-b border-border my-3" />`)

### No other files need changes

The collapsible UI components already exist. The tool registry stays the same. No new dependencies.

