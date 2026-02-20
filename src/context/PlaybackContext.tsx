import { createContext, useContext, useRef, useState, type ReactNode, type RefObject, type MutableRefObject } from 'react';

export interface AudioNodes {
  gainNode: GainNode;
  bassFilter: BiquadFilterNode;
  midFilter: BiquadFilterNode;
  trebleFilter: BiquadFilterNode;
}

interface PlaybackContextValue {
  audioRef: RefObject<HTMLAudioElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  analyserNode: AnalyserNode | null;
  audioNodes: AudioNodes | null;
  videoPortalTarget: HTMLDivElement | null;
  setVideoPortalTarget: (el: HTMLDivElement | null) => void;
  onTrackEndRef: MutableRefObject<(() => void) | null>;
  _setAnalyserNode: (n: AnalyserNode | null) => void;
  _setAudioNodes: (n: AudioNodes | null) => void;
}

const Ctx = createContext<PlaybackContextValue | null>(null);

export function usePlaybackContext() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlaybackContext requires PlaybackProvider');
  return v;
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onTrackEndRef = useRef<(() => void) | null>(null);
  const [analyserNode, _setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [audioNodes, _setAudioNodes] = useState<AudioNodes | null>(null);
  const [videoPortalTarget, setVideoPortalTarget] = useState<HTMLDivElement | null>(null);

  return (
    <Ctx.Provider value={{
      audioRef, videoRef, analyserNode, audioNodes,
      videoPortalTarget, setVideoPortalTarget,
      onTrackEndRef, _setAnalyserNode, _setAudioNodes,
    }}>
      {children}
    </Ctx.Provider>
  );
}
