export interface AudioFileInfo {
  fileName: string;
  fileSize: number;
  format: AudioFormat;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  duration: number;
  codec?: string;
  bitrate?: number;
  lossless: boolean;
}

export type AudioFormat =
  | 'wav'
  | 'flac'
  | 'aiff'
  | 'mp3'
  | 'ogg'
  | 'opus'
  | 'aac'
  | 'm4a'
  | 'alac'
  | 'wma'
  | 'ape'
  | 'wv'
  | 'dsd'
  | 'unknown';

export type VideoFormat =
  | 'mp4'
  | 'webm'
  | 'avi'
  | 'mkv'
  | 'mov'
  | 'unknown';

export interface PCMData {
  channelData: Float32Array[];
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  duration: number;
}

export interface DecodedAudio {
  pcm: PCMData;
  fileInfo: AudioFileInfo;
}

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  trackNumber?: string;
  comment?: string;
  coverArt?: Blob;
  additionalTags?: Record<string, string>;
}

export interface HeaderParseResult {
  format: AudioFormat;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  duration?: number;
  codec?: string;
  bitrate?: number;
  lossless: boolean;
  raw: Record<string, unknown>;
}
