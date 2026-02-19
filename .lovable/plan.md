

# Guardrails and Warnings for File Processing

## Current State

- The `ProcessingBanner` already warns during conversion (sticky red banner + `beforeunload` listener) -- this is done.
- `FileDropZone` has a hard limit of 500MB but no soft warning for large files.
- The 200MB warning threshold (`FILE_SIZE_WARN_BYTES`) is defined in constants but never actually used anywhere.
- No mobile-specific file size limits are enforced despite `FILE_SIZE_LIMIT_MOBILE_BYTES` existing.
- No memory pressure detection or other guardrails exist.

## Plan

### 1. Large File Warning in FileDropZone

Add a yellow warning (not a block) when a file exceeds 200MB but is under the hard limit. Also enforce a lower hard limit on mobile (500MB desktop, 200MB mobile).

**`src/components/shared/FileDropZone.tsx`**:
- Import `FILE_SIZE_WARN_BYTES` from constants
- After accepting a valid file, check if `file.size > FILE_SIZE_WARN_BYTES` -- if so, show a persistent amber warning: "Large file (X MB). Processing may be slow and use significant memory."
- Add a `warning` state alongside the existing `error` state
- Detect mobile via `window.innerWidth < 768` and lower hard limit to 200MB on mobile devices

### 2. Add Memory Pressure Check Before Processing

**`src/hooks/use-ffmpeg.ts`**:
- Before starting `process()`, estimate memory needs (roughly `file.size * 3` for input + decode + output)
- If `navigator.deviceMemory` is available (Chrome) and estimated usage exceeds 70% of reported memory, show a warning via toast (non-blocking)
- This is best-effort -- the API isn't available in all browsers

### 3. Prevent Double File Drops During Processing

**`src/components/shared/FileDropZone.tsx`**:
- Accept a new `disabled` prop
- When disabled, ignore drops/clicks and show a muted visual state

**Tool pages** already hide the drop zone when a file is loaded, so this is a minor safeguard for edge cases.

### 4. Add Export/Download Warning for Large Outputs

**`src/components/shared/DownloadButton.tsx`**:
- If the blob size exceeds 200MB, show a small note below the button: "Large file -- download may take a moment"

### 5. Constants Cleanup

**`src/config/constants.ts`**:
- Add `FILE_SIZE_LIMIT_DESKTOP_BYTES = 500 * 1024 * 1024`
- Rename `FILE_SIZE_LIMIT_MOBILE_BYTES` to be consistent
- Remove the duplicate definitions in `browser-compat.ts`

## Technical Details

### FileDropZone Changes

```text
+-----------------------------+
|  Drop your file here        |
|  or click to browse         |
|                             |
|  [amber] Large file (312MB) |
|  Processing may be slow     |
+-----------------------------+
```

The warning appears after file selection but does NOT block it -- the file still loads. Only exceeding the hard limit blocks.

### Files Modified

| File | Change |
|------|--------|
| `src/components/shared/FileDropZone.tsx` | Large file warning, mobile limit, disabled prop |
| `src/components/shared/DownloadButton.tsx` | Large output note |
| `src/hooks/use-ffmpeg.ts` | Memory pressure toast before processing |
| `src/config/constants.ts` | Add desktop limit constant |
| `src/config/browser-compat.ts` | Remove duplicate size constants, import from constants.ts |

