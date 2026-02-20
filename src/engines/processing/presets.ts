/**
 * FFmpeg command presets for common operations
 */

export interface ConversionPreset {
  label: string;
  ext: string;
  args: (inputName: string, outputName: string) => string[];
}

// ── Audio conversion presets ──

export const AUDIO_OUTPUT_FORMATS = [
  { value: 'mp3', label: 'MP3', ext: 'mp3' },
  { value: 'wav', label: 'WAV', ext: 'wav' },
  { value: 'flac', label: 'FLAC', ext: 'flac' },
  { value: 'aac', label: 'AAC (M4A)', ext: 'm4a' },
  { value: 'ogg', label: 'OGG Vorbis', ext: 'ogg' },
  { value: 'opus', label: 'Opus', ext: 'opus' },
] as const;

export const MP3_BITRATES = [128, 192, 256, 320] as const;

export function audioConvertArgs(
  inputName: string,
  outputName: string,
  format: string,
  bitrate?: number
): string[] {
  const base = ['-i', inputName];

  switch (format) {
    case 'mp3':
      return [...base, '-codec:a', 'libmp3lame', '-b:a', `${bitrate || 320}k`, outputName];
    case 'wav':
      return [...base, '-codec:a', 'pcm_s16le', outputName];
    case 'flac':
      return [...base, '-codec:a', 'flac', outputName];
    case 'aac':
      return [...base, '-codec:a', 'aac', '-b:a', `${bitrate || 256}k`, outputName];
    case 'ogg':
      return [...base, '-codec:a', 'libvorbis', '-q:a', '6', outputName];
    case 'opus':
      return [...base, '-codec:a', 'libopus', '-b:a', `${bitrate || 128}k`, outputName];
    default:
      return [...base, outputName];
  }
}

// ── Trim presets ──

export function trimArgs(
  inputName: string,
  outputName: string,
  startSec: number,
  endSec: number,
  copyCodec = true
): string[] {
  const args = ['-i', inputName, '-ss', startSec.toString(), '-to', endSec.toString()];
  if (copyCodec) {
    args.push('-c', 'copy');
  }
  args.push(outputName);
  return args;
}

// ── Normalize presets ──

export function normalizeArgs(
  inputName: string,
  outputName: string,
  targetLUFS: number
): string[] {
  // Two-pass loudnorm: we do single-pass (measured) for simplicity
  return [
    '-i', inputName,
    '-af', `loudnorm=I=${targetLUFS}:TP=-1:LRA=11`,
    outputName,
  ];
}

// ── Metadata strip ──

export function stripMetadataArgs(inputName: string, outputName: string): string[] {
  return ['-i', inputName, '-map_metadata', '-1', '-c', 'copy', outputName];
}

// ── Sample rate conversion ──

export function resampleArgs(
  inputName: string,
  outputName: string,
  targetRate: number
): string[] {
  return ['-i', inputName, '-ar', targetRate.toString(), outputName];
}

// ── Channel operations ──

export type ChannelOp = 'mono' | 'left' | 'right' | 'swap';

export function channelArgs(
  inputName: string,
  outputName: string,
  op: ChannelOp
): string[] {
  const base = ['-i', inputName];
  switch (op) {
    case 'mono':
      return [...base, '-ac', '1', outputName];
    case 'left':
      return [...base, '-af', 'pan=mono|c0=FL', outputName];
    case 'right':
      return [...base, '-af', 'pan=mono|c0=FR', outputName];
    case 'swap':
      return [...base, '-af', 'pan=stereo|c0=c1|c1=c0', outputName];
    default:
      return [...base, outputName];
  }
}

// ── Video to MP3 ──

export function videoToMp3Args(
  inputName: string,
  outputName: string,
  bitrate = 320
): string[] {
  return ['-i', inputName, '-vn', '-codec:a', 'libmp3lame', '-b:a', `${bitrate}k`, outputName];
}

// ── Video to Audio (copy codec) ──

export function videoToAudioArgs(
  inputName: string,
  outputName: string
): string[] {
  return ['-i', inputName, '-vn', '-c:a', 'copy', outputName];
}

// ── Video mute ──

export function videoMuteArgs(inputName: string, outputName: string): string[] {
  return ['-i', inputName, '-an', '-c:v', 'copy', outputName];
}

// ── Video compress ──

export function videoCompressArgs(
  inputName: string,
  outputName: string,
  crf = 28
): string[] {
  return ['-i', inputName, '-c:v', 'libx264', '-crf', crf.toString(), '-preset', 'fast', '-c:a', 'aac', outputName];
}

// ── Video to GIF ──

export function videoToGifArgs(
  inputName: string,
  outputName: string,
  fps = 10,
  width = 480
): string[] {
  return [
    '-i', inputName,
    '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
    '-loop', '0',
    outputName,
  ];
}

// ── Audio to Video (static image + audio → MP4) ──

export function audioToVideoArgs(
  audioInput: string,
  imageInput: string | null,
  outputName: string,
  width: number,
  height: number,
  audioBitrate = 192
): string[] {
  if (imageInput) {
    return [
      '-loop', '1', '-framerate', '1', '-i', imageInput,
      '-i', audioInput,
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
      '-c:v', 'libx264', '-tune', 'stillimage', '-preset', 'ultrafast', '-r', '1', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', `${audioBitrate}k`,
      '-shortest',
      outputName,
    ];
  }
  // No image — generate a black frame
  return [
    '-f', 'lavfi', '-i', `color=c=black:s=${width}x${height}:r=1`,
    '-i', audioInput,
    '-c:v', 'libx264', '-tune', 'stillimage', '-preset', 'ultrafast', '-r', '1', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', `${audioBitrate}k`,
    '-shortest',
    outputName,
  ];
}

// ── Video convert ──

export const VIDEO_OUTPUT_FORMATS = [
  { value: 'mp4', label: 'MP4', ext: 'mp4' },
  { value: 'webm', label: 'WebM', ext: 'webm' },
] as const;

export function videoConvertArgs(
  inputName: string,
  outputName: string,
  format: string
): string[] {
  if (format === 'webm') {
    return ['-i', inputName, '-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-c:a', 'libopus', outputName];
  }
  return ['-i', inputName, '-c:v', 'libx264', '-crf', '23', '-c:a', 'aac', outputName];
}

// ── Audio merge (concat demuxer) ──

export function audioMergeArgs(
  fileListName: string,
  outputName: string,
  format: string,
  bitrate?: number
): string[] {
  // Always re-encode to ensure compatible output
  switch (format) {
    case 'mp3':
      return ['-f', 'concat', '-safe', '0', '-i', fileListName, '-codec:a', 'libmp3lame', '-b:a', `${bitrate || 320}k`, outputName];
    case 'wav':
      return ['-f', 'concat', '-safe', '0', '-i', fileListName, '-codec:a', 'pcm_s16le', outputName];
    case 'flac':
      return ['-f', 'concat', '-safe', '0', '-i', fileListName, '-codec:a', 'flac', outputName];
    case 'aac':
      return ['-f', 'concat', '-safe', '0', '-i', fileListName, '-codec:a', 'aac', '-b:a', `${bitrate || 256}k`, outputName];
    case 'ogg':
      return ['-f', 'concat', '-safe', '0', '-i', fileListName, '-codec:a', 'libvorbis', '-q:a', '6', outputName];
    case 'opus':
      return ['-f', 'concat', '-safe', '0', '-i', fileListName, '-codec:a', 'libopus', '-b:a', `${bitrate || 128}k`, outputName];
    default:
      return ['-f', 'concat', '-safe', '0', '-i', fileListName, outputName];
  }
}

// ── Gain injection utility ──

export function injectGainFilter(args: string[], gainDb: number): string[] {
  if (gainDb === 0) return args;
  const volumeFilter = `volume=${gainDb}dB`;
  const result = [...args];
  const afIndex = result.indexOf('-af');
  if (afIndex !== -1 && afIndex + 1 < result.length) {
    result[afIndex + 1] = `${result[afIndex + 1]},${volumeFilter}`;
  } else {
    // Insert before the last arg (output filename)
    result.splice(result.length - 1, 0, '-af', volumeFilter);
  }
  return result;
}
