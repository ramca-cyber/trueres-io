

# Audit Fix: Sitemap Sync, True Peak Disclaimer, and Code Accuracy

## Issues Addressed

### 1. Sitemap missing `audio-to-video`
The tool exists in the registry (route `/audio-to-video`) but has no entry in `public/sitemap.xml`.

**Fix**: Add the missing URL entry to the sitemap.

### 2. LUFS "True Peak" code/UI inconsistencies
The LUFS Meter UI correctly labels it "Sample Peak" with subtext "(not true peak)" -- good. But there are two remaining inconsistencies:

- **`lufs.ts` line 113**: Comment says "True Peak (oversampled peak detection, simplified 4x)" but the code just scans raw samples with no oversampling. Fix the misleading comment.
- **`ComplianceBadge.tsx`**: Displays "dBTP" (decibels True Peak) next to the value, but this is sample peak, not true peak. Change label to "dBFS" and add a note.

### 3. Items NOT being changed (and why)

| Issue | Status | Reason |
|-------|--------|--------|
| FFT trig per-stage vs global cache | No change | Current per-stage tables are already fast; marginal gain not worth the complexity |
| Bit depth on Float32 | No change | Web Audio API limitation; cannot be fixed without a custom decoder |
| Domain not deployed | No change | Infrastructure task outside code scope |
| No ad infrastructure | No change | Business decision, not a code fix |

## File Changes

### `public/sitemap.xml`
Add one entry after the existing Audio Processing section:
```xml
<url><loc>https://trueres.io/audio-to-video</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
```

### `src/engines/analysis/modules/lufs.ts`
Fix the misleading comment at line 113:
```typescript
// Sample peak (per-sample max, not ITU-R BS.1770 true peak which requires 4x oversampling)
```

### `src/components/display/ComplianceBadge.tsx`
Change the target display from "dBTP" to "dBFS" since we're measuring sample peak, not true peak:
```
Target: -14 LUFS / -1 dBFS
```

