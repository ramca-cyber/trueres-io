

# Optimize Audio-to-Video Conversion Speed

## Root Cause

When an image is provided, the FFmpeg command uses `-loop 1 -i image.jpg` which defaults the input framerate to **25 fps**. The output is set to `-r 1` (1 fps), but FFmpeg still decodes, scales, and crops the image **25 times per second** before discarding 24 of every 25 frames.

For a 5-minute audio track, this means:
- **Current (with image)**: 5 x 60 x 25 = 7,500 scale+crop operations, then 7,200 frames discarded
- **Fixed (with image)**: 5 x 60 x 1 = 300 scale+crop operations, zero waste
- **Black frame path**: Already efficient at 1 fps natively

This is a **25x reduction** in video processing work.

## Fix

Add `-framerate 1` before the image input so FFmpeg reads the image at 1 fps to match the output rate.

## File Change

**`src/engines/processing/presets.ts`** -- `audioToVideoArgs` function

Change the image branch from:
```
'-loop', '1', '-i', imageInput,
```
to:
```
'-loop', '1', '-framerate', '1', '-i', imageInput,
```

That's it. One line, massive speedup. Everything else (scaling, encoding, tune, preset) stays the same.

## Why This Works

`-framerate` is an input option that controls how fast FFmpeg reads the looped image stream. Setting it to 1 means FFmpeg only produces 1 frame per second from the image, matching the output `-r 1`. No frames are decoded, scaled, and then thrown away.
