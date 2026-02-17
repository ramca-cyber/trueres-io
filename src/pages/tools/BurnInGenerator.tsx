import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateNoise } from '@/engines/analysis/generators/noise';
import { Play, Square, AlertTriangle } from 'lucide-react';

const tool = getToolById('burn-in-generator')!;

type Phase = 'pink' | 'sweep' | 'white' | 'brown';

const PHASE_LABELS: Record<Phase, string> = {
  pink: 'Pink Noise',
  sweep: 'Frequency Sweep',
  white: 'White Noise',
  brown: 'Brown Noise',
};

const PHASE_ORDER: Phase[] = ['pink', 'sweep', 'white', 'brown'];

const BurnInGenerator = () => {
  const [level, setLevel] = useState([-20]);
  const [duration, setDuration] = useState('1'); // hours
  const [playing, setPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<Phase>('pink');
  const [elapsed, setElapsed] = useState(0); // seconds
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | OscillatorNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(false);

  const amplitude = Math.pow(10, level[0] / 20);
  const totalSeconds = parseFloat(duration) * 3600;

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopAll = useCallback(() => {
    playingRef.current = false;
    try { (sourceRef.current as any)?.stop?.(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    if (timerRef.current) clearInterval(timerRef.current);
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    audioCtxRef.current = null;
    sourceRef.current = null;
    timerRef.current = null;
    phaseTimerRef.current = null;
    setPlaying(false);
    setElapsed(0);
  }, []);

  const playNoisePhase = useCallback((ctx: AudioContext, type: 'white' | 'pink' | 'brown') => {
    const sr = ctx.sampleRate;
    const segDuration = 30;
    const buffer = ctx.createBuffer(1, sr * segDuration, sr);
    const data = generateNoise(segDuration, sr, type, amplitude);
    buffer.getChannelData(0).set(data);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(ctx.destination);
    source.start();
    sourceRef.current = source;
  }, [amplitude]);

  const playSweepPhase = useCallback((ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    gain.gain.value = amplitude;
    osc.connect(gain).connect(ctx.destination);
    // Continuous sweep 20-20000 Hz over 60s, looping via scheduling
    osc.frequency.setValueAtTime(20, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20000, ctx.currentTime + 60);
    osc.start();
    sourceRef.current = osc;
  }, [amplitude]);

  const startBurnIn = useCallback(() => {
    stopAll();
    playingRef.current = true;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    setPlaying(true);
    setElapsed(0);
    setCurrentPhase('pink');

    // Start with pink noise
    playNoisePhase(ctx, 'pink');

    // Cycle phases every 5 minutes
    const phaseDuration = 5 * 60 * 1000;
    let phaseIndex = 0;

    const cyclePhase = () => {
      if (!playingRef.current) return;
      phaseIndex = (phaseIndex + 1) % PHASE_ORDER.length;
      const phase = PHASE_ORDER[phaseIndex];
      setCurrentPhase(phase);
      try { (sourceRef.current as any)?.stop?.(); } catch {}

      if (phase === 'sweep') {
        playSweepPhase(ctx);
      } else {
        playNoisePhase(ctx, phase as 'white' | 'pink' | 'brown');
      }
      phaseTimerRef.current = setTimeout(cyclePhase, phaseDuration);
    };

    phaseTimerRef.current = setTimeout(cyclePhase, phaseDuration);

    // Elapsed timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(secs);
      if (secs >= totalSeconds) stopAll();
    }, 1000);
  }, [stopAll, playNoisePhase, playSweepPhase, totalSeconds]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const progress = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 0;

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Disclaimer:</strong> Headphone "burn-in" is scientifically debated. Most controlled studies show no measurable difference. 
            This tool is provided for those who wish to try it — your perception may change, but measurable driver characteristics typically don't.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Duration</Label>
                <Select value={duration} onValueChange={setDuration} disabled={playing}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">30 minutes</SelectItem>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="8">8 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Level: {level[0]} dBFS</Label>
                <Slider min={-40} max={-6} step={1} value={level} onValueChange={setLevel} className="mt-2" />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3">
              {playing ? (
                <>
                  <p className="text-sm font-medium text-primary">{PHASE_LABELS[currentPhase]}</p>
                  <p className="text-3xl font-heading font-bold tabular-nums">{formatTime(elapsed)}</p>
                  <p className="text-xs text-muted-foreground">of {formatTime(totalSeconds)}</p>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Cycles: Pink noise → Sweep → White noise → Brown noise</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            {!playing ? (
              <Button onClick={startBurnIn} className="gap-2">
                <Play className="h-4 w-4" /> Start Burn-In
              </Button>
            ) : (
              <Button onClick={stopAll} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" /> Stop
              </Button>
            )}
          </div>
        </div>
      </div>
    </ToolPage>
  );
};

export default BurnInGenerator;
