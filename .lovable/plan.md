
# Audio to Video Converter

## What It Does

Takes an audio file + optional background image and produces an MP4 video. If an image is provided, it gets scaled/cropped to fit the chosen resolution. If no image, a solid black frame is used. That's it -- no text overlays, no fancy graphics.

## User Flow

1. Drop an audio file
2. Optionally upload a background image
3. Pick resolution preset (1920x1080, 1280x720, 1080x1080, 1080x1920)
4. Click "Generate Video"
5. Download MP4

## Resolution Presets

| Label | Size | Use Case |
|-------|------|----------|
| 1080p (16:9) | 1920x1080 | YouTube standard |
| 720p (16:9) | 1280x720 | Smaller file |
| Square | 1080x1080 | Social media |
| Vertical | 1080x1920 | Shorts / TikTok |

## Technical Details

### FFmpeg Strategy

**With image:**
```
-loop 1 -i image.png -i audio.mp3
-c:v libx264 -tune stillimage -pix_fmt yuv420p
-vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080"
-c:a aac -b:a 192k -shortest
output.mp4
```

The `scale` filter stretches to fill (preserving aspect ratio, oversizing the smaller dimension), then `crop` trims the excess -- standard "cover" behavior, no distortion.

**Without image (black frame):**
Generate a black frame using `color` source:
```
-f lavfi -i color=c=black:s=1920x1080:r=1
-i audio.mp3
-c:v libx264 -tune stillimage -pix_fmt yuv420p
-c:a aac -b:a 192k -shortest
output.mp4
```

### File Changes

**New: `src/pages/tools/AudioToVideo.tsx`**
- FileDropZone for audio (required)
- Second FileDropZone for image (optional, accepts .png,.jpg,.jpeg,.webp)
- Resolution select dropdown
- Image preview thumbnail (if uploaded)
- Standard progress bar + download flow using `useFFmpeg`

**Modified: `src/engines/processing/presets.ts`**
- Add `audioToVideoArgs(audioInput, imageInput | null, outputName, width, height)` function

**Modified: `src/config/constants.ts`**
- Add `IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp'`

**Modified: `src/config/tool-registry.ts`**
- Add tool entry: id `audio-to-video`, route `/audio-to-video`, category `processing`, engine `ffmpeg`

**Modified: `src/App.tsx`**
- Add lazy import and route for AudioToVideo

**Modified: `src/config/tool-faqs.ts`**
- Add FAQ entries for the tool
