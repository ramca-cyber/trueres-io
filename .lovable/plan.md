
# Minor Cleanup in AudioConverter.tsx

## Issues Found

1. **3 extra blank lines** (lines 52-54) after `const batch = useBatchProcess();` -- leftover whitespace from a previous edit
2. **Unused destructured variable**: `outputFileName` is pulled from `useFFmpeg()` but never referenced in the component

## Changes

**`src/pages/tools/AudioConverter.tsx`**

- Remove the 3 blank lines after line 51
- Remove `outputFileName` from the destructured `useFFmpeg()` return

No other files need cleanup -- the rest of the codebase is consistent and tidy.
