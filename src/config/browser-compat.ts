export interface BrowserCapabilities {
  webAudio: boolean;
  webGL: boolean;
  webWorkers: boolean;
  wasm: boolean;
  sharedArrayBuffer: boolean;
  offscreenCanvas: boolean;
  indexedDB: boolean;
}

export interface CompatWarning {
  feature: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  affectedTools?: string[];
}

export function detectCapabilities(): BrowserCapabilities {
  return {
    webAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
    webGL: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
      } catch { return false; }
    })(),
    webWorkers: typeof Worker !== 'undefined',
    wasm: typeof WebAssembly !== 'undefined',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    indexedDB: typeof indexedDB !== 'undefined',
  };
}

export function getCompatWarnings(caps: BrowserCapabilities): CompatWarning[] {
  const warnings: CompatWarning[] = [];

  if (!caps.wasm) {
    warnings.push({
      feature: 'WebAssembly',
      message: 'Your browser does not support WebAssembly. Audio/video processing tools will not work.',
      severity: 'critical',
      affectedTools: ['audio-converter', 'audio-trimmer', 'audio-normalizer', 'video-to-mp3', 'video-trimmer', 'video-compressor'],
    });
  }

  if (!caps.webAudio) {
    warnings.push({
      feature: 'Web Audio API',
      message: 'Your browser does not support Web Audio API. Analysis and playback tools will not work.',
      severity: 'critical',
    });
  }

  if (!caps.sharedArrayBuffer) {
    warnings.push({
      feature: 'SharedArrayBuffer',
      message: 'SharedArrayBuffer is not available. Processing tools will still work but may be slower (single-threaded mode). Try Chrome or Firefox for best performance.',
      severity: 'info',
      affectedTools: ['audio-converter', 'video-to-mp3', 'video-compressor'],
    });
  }

  if (!caps.webGL) {
    warnings.push({
      feature: 'WebGL',
      message: 'WebGL is not available. Spectrograms will use a Canvas 2D fallback with lower performance.',
      severity: 'info',
      affectedTools: ['spectrogram'],
    });
  }

  if (!caps.webWorkers) {
    warnings.push({
      feature: 'Web Workers',
      message: 'Web Workers not available. Analysis will run on the main thread and may freeze the UI.',
      severity: 'warning',
    });
  }

  return warnings;
}

export function isBrowserFullySupported(caps: BrowserCapabilities): boolean {
  return caps.webAudio && caps.wasm && caps.webWorkers && caps.webGL;
}

export function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

// File size constants moved to src/config/constants.ts
// Use FILE_SIZE_WARN_BYTES, FILE_SIZE_LIMIT_DESKTOP_BYTES, FILE_SIZE_LIMIT_MOBILE_BYTES from there
