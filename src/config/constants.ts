// Supported audio formats for file input accept attributes
export const AUDIO_ACCEPT = '.wav,.flac,.aiff,.aif,.mp3,.ogg,.opus,.aac,.m4a,.wma,.ape,.wv,.weba';
export const VIDEO_ACCEPT = '.mp4,.webm,.avi,.mkv,.mov';
export const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp';
export const ALL_MEDIA_ACCEPT = `${AUDIO_ACCEPT},${VIDEO_ACCEPT}`;

// File size limits
export const FILE_SIZE_WARN_BYTES = 200 * 1024 * 1024; // 200MB
export const FILE_SIZE_LIMIT_MOBILE_BYTES = 500 * 1024 * 1024; // 500MB

// Analysis defaults
export const DEFAULT_FFT_SIZE = 4096;
export const FFT_SIZES = [1024, 2048, 4096, 8192, 16384] as const;
export const DEFAULT_HOP_SIZE = 1024;

// Window functions
export const WINDOW_FUNCTIONS = ['hann', 'hamming', 'blackman', 'blackman-harris', 'kaiser', 'flat-top'] as const;
export type WindowFunction = typeof WINDOW_FUNCTIONS[number];

// Colormaps
export const COLORMAPS = ['magma', 'inferno', 'viridis', 'plasma', 'grayscale'] as const;
export type Colormap = typeof COLORMAPS[number];

// Platform loudness targets (LUFS)
export const PLATFORM_TARGETS = {
  spotify: { lufs: -14, truePeak: -1 },
  youtube: { lufs: -14, truePeak: -1 },
  apple: { lufs: -16, truePeak: -1 },
  tidal: { lufs: -14, truePeak: -1 },
  amazon: { lufs: -14, truePeak: -2 },
  podcast: { lufs: -16, truePeak: -1 },
} as const;

// Noise types
export const NOISE_TYPES = ['white', 'pink', 'brown', 'blue', 'violet', 'grey'] as const;
export type NoiseType = typeof NOISE_TYPES[number];

// Waveform types
export const WAVEFORM_TYPES = ['sine', 'square', 'triangle', 'sawtooth'] as const;
export type WaveformType = typeof WAVEFORM_TYPES[number];

// Common sample rates
export const SAMPLE_RATES = [8000, 11025, 16000, 22050, 44100, 48000, 88200, 96000, 176400, 192000] as const;

// Format display names
export const FORMAT_NAMES: Record<string, string> = {
  wav: 'WAV',
  flac: 'FLAC',
  aiff: 'AIFF',
  mp3: 'MP3',
  ogg: 'OGG Vorbis',
  opus: 'Opus',
  aac: 'AAC',
  m4a: 'M4A (AAC)',
  alac: 'ALAC',
  wma: 'WMA',
  ape: 'APE',
  wv: 'WavPack',
  dsd: 'DSD',
  mp4: 'MP4',
  webm: 'WebM',
  avi: 'AVI',
  mkv: 'MKV',
  mov: 'MOV',
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  if (m > 0) return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  return `${s}.${ms.toString().padStart(3, '0')}s`;
}

export function formatFrequency(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)} kHz`;
  return `${hz.toFixed(0)} Hz`;
}
