import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

const CORE_VERSION = '0.12.10';
const CDN_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
const CORE_URL = `${CDN_BASE}/ffmpeg-core.js`;
const WASM_URL = `${CDN_BASE}/ffmpeg-core.wasm`;

export type FFmpegProgressCallback = (progress: number) => void;

const LOAD_TIMEOUT_MS = 60_000; // 60s — WASM file is ~30MB

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(
      `${label} timed out after ${ms / 1000}s. The ~30 MB engine may still be downloading. Please try again on a faster connection.`
    )), ms);
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

    // Fetch core files and convert to blob URLs to avoid CORS issues
    let coreURL: string;
    let wasmURL: string;
    try {
      [coreURL, wasmURL] = await Promise.all([
        withTimeout(toBlobURL(CORE_URL, 'text/javascript'), LOAD_TIMEOUT_MS, 'Core JS download'),
        withTimeout(toBlobURL(WASM_URL, 'application/wasm'), LOAD_TIMEOUT_MS, 'WASM download'),
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Failed to download FFmpeg files from CDN: ${msg}`);
    }

    try {
      await withTimeout(
        ffmpeg.load({ coreURL, wasmURL }),
        LOAD_TIMEOUT_MS,
        'FFmpeg initialization',
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`FFmpeg failed to initialize: ${msg}`);
    }

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
 * Cancel any in-progress FFmpeg operation by terminating the worker.
 * The instance must be re-loaded before next use.
 */
export function cancelProcessing(): void {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch {
      // Ignore errors during termination
    }
    ffmpegInstance = null;
    loadPromise = null;
  }
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
