const elements = new Set<HTMLMediaElement>();

function onPlay(this: HTMLMediaElement) {
  for (const el of elements) {
    if (el !== this && !el.paused) {
      el.pause();
    }
  }
}

export function register(el: HTMLMediaElement) {
  elements.add(el);
  el.addEventListener('play', onPlay);
}

export function unregister(el: HTMLMediaElement) {
  el.removeEventListener('play', onPlay);
  elements.delete(el);
}
