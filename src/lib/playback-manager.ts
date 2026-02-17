const elements = new Set<HTMLMediaElement>();
const callbacks = new Map<string, () => void>();

function pauseAllExceptElement(active: HTMLMediaElement) {
  for (const el of elements) {
    if (el !== active && !el.paused) el.pause();
  }
  for (const [, stopFn] of callbacks) stopFn();
}

function onPlay(this: HTMLMediaElement) {
  pauseAllExceptElement(this);
}

export function register(el: HTMLMediaElement) {
  elements.add(el);
  el.addEventListener('play', onPlay);
}

export function unregister(el: HTMLMediaElement) {
  el.removeEventListener('play', onPlay);
  elements.delete(el);
}

/** Register a Web Audio stop callback (oscillators, AudioBufferSourceNodes, etc.) */
export function registerCallback(id: string, stopFn: () => void) {
  callbacks.set(id, stopFn);
}

export function unregisterCallback(id: string) {
  callbacks.delete(id);
}

/** Call before starting a Web Audio source — pauses all HTMLMediaElements and stops all other registered callbacks */
export function notifyPlayStart(id: string) {
  for (const el of elements) {
    if (!el.paused) el.pause();
  }
  for (const [cbId, stopFn] of callbacks) {
    if (cbId !== id) stopFn();
  }
}
