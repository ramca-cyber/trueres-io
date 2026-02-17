import { useEffect, useState, forwardRef, useRef, useCallback, useImperativeHandle } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { register, unregister } from '@/lib/playback-manager';

interface AudioPlayerProps {
  src: File | Blob;
  label?: string;
  className?: string;
  onEnded?: () => void;
  autoPlay?: boolean;
  onAnalyserReady?: (analyser: AnalyserNode) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  ({ src, label, className, onEnded, autoPlay, onAnalyserReady }, ref) => {
    const [url, setUrl] = useState<string>('');
    const innerRef = useRef<HTMLAudioElement>(null);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [showSpeed, setShowSpeed] = useState(false);

    // EQ state
    const [bass, setBass] = useState(0);
    const [mid, setMid] = useState(0);
    const [treble, setTreble] = useState(0);
    const [showEQ, setShowEQ] = useState(false);

    // Web Audio nodes
    const ctxRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const gainRef = useRef<GainNode | null>(null);
    const bassRef = useRef<BiquadFilterNode | null>(null);
    const midRef = useRef<BiquadFilterNode | null>(null);
    const trebleRef = useRef<BiquadFilterNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    useImperativeHandle(ref, () => innerRef.current!, []);

    useEffect(() => {
      const objectUrl = URL.createObjectURL(src);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }, [src]);

    // Initialize Web Audio graph — only once per <audio> element mount
    useEffect(() => {
      const el = innerRef.current;
      if (!el || sourceRef.current) return; // already connected

      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(el);

      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 250;
      bassFilter.gain.value = 0;

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.frequency.value = 1000;
      midFilter.Q.value = 1;
      midFilter.gain.value = 0;

      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 4000;
      trebleFilter.gain.value = 0;

      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      source.connect(bassFilter);
      bassFilter.connect(midFilter);
      midFilter.connect(trebleFilter);
      trebleFilter.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      ctxRef.current = ctx;
      sourceRef.current = source;
      gainRef.current = gain;
      bassRef.current = bassFilter;
      midRef.current = midFilter;
      trebleRef.current = trebleFilter;
      analyserRef.current = analyser;

      onAnalyserReady?.(analyser);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Register with playback manager & close AudioContext on unmount
    useEffect(() => {
      const el = innerRef.current;
      if (el) register(el);
      return () => {
        if (el) unregister(el);
        ctxRef.current?.close().catch(() => {});
      };
    }, []);

    useEffect(() => {
      if (gainRef.current) gainRef.current.gain.value = muted ? 0 : volume;
    }, [volume, muted]);

    useEffect(() => {
      if (bassRef.current) bassRef.current.gain.value = bass;
      if (midRef.current) midRef.current.gain.value = mid;
      if (trebleRef.current) trebleRef.current.gain.value = treble;
    }, [bass, mid, treble]);

    useEffect(() => {
      if (innerRef.current) innerRef.current.playbackRate = speed;
    }, [speed]);

    const resetEQ = useCallback(() => { setBass(0); setMid(0); setTreble(0); }, []);
    const eqIsFlat = bass === 0 && mid === 0 && treble === 0;

    return (
      <div className={cn('space-y-3', className)}>
        {label && (
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
        )}
        <audio
          ref={innerRef}
          controls
          preload="metadata"
          src={url}
          className="w-full [color-scheme:dark]"
          onEnded={onEnded}
          autoPlay={autoPlay}
        />

        {/* Controls row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Volume */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0"
              onClick={() => setMuted(m => !m)}>
              {muted || volume === 0
                ? <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                : <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
            <Slider min={0} max={1} step={0.01} value={[muted ? 0 : volume]}
              onValueChange={([v]) => { setVolume(v); if (v > 0) setMuted(false); }}
              className="flex-1" />
            <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
              {Math.round((muted ? 0 : volume) * 100)}%
            </span>
          </div>

          {/* Speed */}
          <div className="relative">
            <Button variant="ghost" size="sm"
              className={cn('h-7 px-2 text-xs font-mono gap-1', speed !== 1 && 'text-primary')}
              onClick={() => setShowSpeed(s => !s)}>
              <Gauge className="h-3 w-3" />{speed}x
            </Button>
            {showSpeed && (
              <div className="absolute bottom-full left-0 mb-1 rounded-md border border-border bg-card p-1 shadow-lg z-10 flex gap-0.5">
                {SPEEDS.map(s => (
                  <button key={s} onClick={() => { setSpeed(s); setShowSpeed(false); }}
                    className={cn('px-2 py-1 rounded text-xs font-mono transition-colors',
                      s === speed ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground')}>
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* EQ toggle */}
          <Button variant="ghost" size="sm"
            className={cn('h-7 px-2 text-xs', !eqIsFlat && 'text-primary')}
            onClick={() => setShowEQ(s => !s)}>
            EQ
          </Button>
        </div>

        {/* EQ Panel */}
        {showEQ && (
          <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Equalizer</span>
              <button onClick={resetEQ}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                Reset
              </button>
            </div>
            {[
              { label: 'Bass', value: bass, set: setBass },
              { label: 'Mid', value: mid, set: setMid },
              { label: 'Treble', value: treble, set: setTreble },
            ].map(band => (
              <div key={band.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-12">{band.label}</span>
                <Slider min={-12} max={12} step={1} value={[band.value]}
                  onValueChange={([v]) => band.set(v)} className="flex-1" />
                <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">
                  {band.value > 0 ? '+' : ''}{band.value} dB
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer';
