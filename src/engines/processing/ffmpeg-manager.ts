import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

const CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js';
const WASM_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm';

export type FFmpegProgressCallback = (progress: number) => void;

const LOAD_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s. This may be due to browser limitations (SharedArrayBuffer not available). Try using Chrome or Firefox with proper CORS headers.`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Get or initialize the FFmpeg instance (singleton, lazy-loaded)
 */
export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();

    // Load with CDN-hosted core to avoid CORS/bundling issues
    const coreURL = await toBlobURL(CORE_URL, 'text/javascript');
    const wasmURL = await toBlobURL(WASM_URL, 'application/wasm');

    await withTimeout(
      ffmpeg.load({ coreURL, wasmURL }),
      LOAD_TIMEOUT_MS,
      'FFmpeg engine load',
    );

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await loadPromise;
  } catch (e) {
    loadPromise = null;
    throw e;
  }
}

/**
 * Check if FFmpeg is already loaded
 */
export function isFFmpegLoaded(): boolean {
  return ffmpegInstance?.loaded === true;
}

/**
 * Write a file into FFmpeg's virtual filesystem
 */
export async function writeInputFile(name: string, data: File | Blob | ArrayBuffer | Uint8Array): Promise<void> {
  const ffmpeg = await getFFmpeg();
  let uint8: Uint8Array;

  if (data instanceof File || data instanceof Blob) {
    uint8 = await fetchFile(data);
  } else if (data instanceof ArrayBuffer) {
    uint8 = new Uint8Array(data);
  } else {
    uint8 = data;
  }

  await ffmpeg.writeFile(name, uint8);
}

/**
 * Read an output file from FFmpeg's virtual filesystem
 */
export async function readOutputFile(name: string): Promise<Uint8Array> {
  const ffmpeg = await getFFmpeg();
  const data = await ffmpeg.readFile(name);
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }
  return data;
}

/**
 * Execute an FFmpeg command
 */
export async function exec(args: string[], onProgress?: FFmpegProgressCallback): Promise<void> {
  const ffmpeg = await getFFmpeg();

  if (onProgress) {
    const handler = ({ progress }: { progress: number }) => {
      onProgress(Math.round(progress * 100));
    };
    ffmpeg.on('progress', handler);
    try {
      await ffmpeg.exec(args);
    } finally {
      ffmpeg.off('progress', handler);
    }
  } else {
    await ffmpeg.exec(args);
  }
}

/**
 * Clean up files from the virtual filesystem
 */
export async function deleteFile(name: string): Promise<void> {
  try {
    const ffmpeg = await getFFmpeg();
    await ffmpeg.deleteFile(name);
  } catch {
    // Ignore errors from deleting non-existent files
  }
}

/**
 * High-level: process a file with ffmpeg args
 */
export async function processFile(
  inputFile: File,
  inputName: string,
  outputName: string,
  args: string[],
  onProgress?: FFmpegProgressCallback
): Promise<Blob> {
  await writeInputFile(inputName, inputFile);

  await exec(args, onProgress);

  const outputData = await readOutputFile(outputName);

  // Clean up
  await deleteFile(inputName);
  await deleteFile(outputName);

  // Determine MIME type from extension
  const ext = outputName.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    opus: 'audio/ogg',
    aiff: 'audio/aiff',
    mp4: 'video/mp4',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    gif: 'image/gif',
  };

  return new Blob([outputData.buffer as ArrayBuffer], { type: mimeMap[ext] || 'application/octet-stream' });
}
