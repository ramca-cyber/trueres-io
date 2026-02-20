

# Move "Start over" to the same row as Export / Add files

## Problem
The "Start over" button is rendered as a standalone element below the queue card (inside `PlaylistPanel.tsx`), while "Export .m3u" and "Add files" live in a separate row in `MediaPlayer.tsx`. This makes it look orphaned and disconnected.

## Solution
Remove the "Start over" button from `PlaylistPanel` and place it in the existing button row in `MediaPlayer.tsx`, aligned to the right using `ml-auto`.

### Visual result
```text
[ Export .m3u ]  [ Add files ]                    [ Start over ]
```

## Changes

### 1. `src/components/shared/PlaylistPanel.tsx`
- Remove the "Start over" `div` block below the queue card (lines 172-177)
- Remove `RotateCcw` from the icon imports (no longer used here)
- The outer wrapper `div` with `space-y-1.5` can be simplified since it only contains the card now

### 2. `src/pages/tools/MediaPlayer.tsx`
- In the playlist utilities row (lines 831-838), add the "Start over" button with destructive styling and `ml-auto` to push it to the right end of the row
- Add `RotateCcw` to the icon imports

