

# Add MKV, AVI, WMA Playback via FFmpeg Transcoding

## Overview

Browsers cannot natively play MKV, AVI, or WMA files. To support them in the Media Player, we will **auto-transcode** these formats to browser-friendly equivalents using the FFmpeg engine already in the project. The user drops a `.mkv` file, sees a brief "Converting for playback..." progress bar, and then the player loads with the transcoded result.

## How It Works

```text
User drops file
      |
      v
Is it natively playable?
(mp4, webm, mov, mp3, flac, wav, ogg, aac, m4a, aiff, opus)
      |              |
     YES            NO (mkv, avi, wma)
      |              |
      v              v
Play directly    Transcode via FFmpeg
                  - MKV/AVI -> MP4 (copy codecs when possible)
                  - WMA -> MP3
                      |
                      v
                 Show progress bar
                      |
                      v
                 Play transcoded blob
```

## Transcoding Details

- **MKV / AVI -> MP4**: Use `-c copy` first (fast remux, no re-encoding). The codecs inside MKV/AVI are often H.264+AAC which MP4 supports natively. If that fails (incompatible codecs), fall back to re-encoding.
- **WMA -> MP3**: Re-encode to MP3 at 192kbps since the codecs are fundamentally different.

## UI Changes

When a non-native file is loaded, instead of immediately showing the player, show:
1. A status message: "Converting for playback..."
2. The FFmpeg progress bar (reuse the existing `ProgressBar` component)
3. On completion, swap to the normal player view with the transcoded blob
4. On error, show an error message with a retry button

## Technical Details

### Files to modify

| File | Changes |
|------|---------|
| `src/pages/tools/MediaPlayer.tsx` | Add transcoding flow for non-native formats; new state for transcoded blob and loading UI |
| `src/config/constants.ts` | Already has MKV/AVI in `VIDEO_ACCEPT` -- add `.wma` to `AUDIO_ACCEPT` and `ALL_MEDIA_ACCEPT` |

### Constants update (`constants.ts`)

Add `.wma` to `AUDIO_ACCEPT` so the file input accepts it:
```
AUDIO_ACCEPT = '...,.wma'
```

### MediaPlayer.tsx changes

1. Define which extensions need transcoding:
   ```
   const NEEDS_TRANSCODE = ['mkv', 'avi', 'wma'];
   ```

2. Define a helper to check if a file is natively playable:
   ```
   const NATIVE_VIDEO = ['mp4', 'webm', 'mov'];
   const NATIVE_AUDIO = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'aiff', 'opus'];
   ```

3. Add state for the transcoded blob and transcoding status:
   ```
   const [playbackSrc, setPlaybackSrc] = useState<File | Blob | null>(null);
   const [transcoding, setTranscoding] = useState(false);
   const [transError, setTransError] = useState<string | null>(null);
   ```

4. On file select: check extension. If native, set `playbackSrc = file` immediately. If needs transcode, run FFmpeg:
   - MKV/AVI: `ffmpeg -i input.mkv -c copy output.mp4` (fast remux attempt)
   - WMA: `ffmpeg -i input.wma -ab 192k output.mp3`

5. Show a transcoding state in the UI:
   - Progress bar from `ProgressBar` component
   - "Converting for playback..." label
   - Error state with retry button

6. Pass `playbackSrc` (which is either the original File or the transcoded Blob) to `AudioPlayer` / `VideoPlayer`

### Implementation order

1. Update `AUDIO_ACCEPT` in `constants.ts` to include `.wma`
2. Update `MediaPlayer.tsx` with transcoding logic and UI states
