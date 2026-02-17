import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Play, Square } from 'lucide-react';

const tool = getToolById('subwoofer-test')!;

const FREQ_STEPS = [10, 20, 25, 30, 40, 50, 60, 80, 100, 120];

const SubwooferTest = () => {
  const [level, setLevel] = useState([-12]);
  const [playing, setPlaying] = useState(false);
  const [activeFreq, setActiveFreq] = useState<number | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [crossoverFreq, setCrossoverFreq] = useState([80]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sweepAnimRef = useRef<number | null>(null);

  const amplitude = Math.pow(10, level[0] / 20);

  useEffect(() => {
    return () => {
      if (sweepAnimRef.current) cancelAnimationFrame(sweepAnimRef.current);
      try { oscRef.current?.stop(); } catch {}
      audioCtxRef.current?.close();
    };
  }, []);

  const stopAll = useCallback(() => {
    if (sweepAnimRef.current) { cancelAnimationFrame(sweepAnimRef.current); sweepAnimRef.current = null; }
    try { oscRef.current?.stop(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    oscRef.current = null;
    gainRef.current = null;
    setPlaying(false);
    setSweeping(false);
    setActiveFreq(null);
  }, []);

  const playFreq = useCallback((freq: number) => {
    stopAll();
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = amplitude;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    audioCtxRef.current = ctx;
    oscRef.current = osc;
    gainRef.current = gain;
    setPlaying(true);
    setActiveFreq(freq);
  }, [amplitude, stopAll]);

  const startSweep = useCallback(() => {
    stopAll();
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 10;
    gain.gain.value = amplitude;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    audioCtxRef.current = ctx;
    oscRef.current = osc;
    gainRef.current = gain;
    setPlaying(true);
    setSweeping(true);

    const duration = 15; // seconds
    const startTime = ctx.currentTime;
    const minF = 10, maxF = 200;

    const animate = () => {
      if (!oscRef.current || !audioCtxRef.current) return;
      const elapsed = audioCtxRef.current.currentTime - startTime;
      if (elapsed >= duration) { stopAll(); return; }
      const t = elapsed / duration;
      const freq = minF * Math.pow(maxF / minF, t);
      oscRef.current.frequency.value = freq;
      setActiveFreq(Math.round(freq));
      sweepAnimRef.current = requestAnimationFrame(animate);
    };
    sweepAnimRef.current = requestAnimationFrame(animate);
  }, [amplitude, stopAll]);

  const startCrossoverSweep = useCallback(() => {
    stopAll();
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 40;
    gain.gain.value = amplitude;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    audioCtxRef.current = ctx;
    oscRef.current = osc;
    gainRef.current = gain;
    setPlaying(true);
    setSweeping(true);

    const duration = 12;
    const startTime = ctx.currentTime;
    const minF = 40, maxF = 160;

    const animate = () => {
      if (!oscRef.current || !audioCtxRef.current) return;
      const elapsed = audioCtxRef.current.currentTime - startTime;
      if (elapsed >= duration) { stopAll(); return; }
      const t = elapsed / duration;
      const freq = minF + (maxF - minF) * t;
      oscRef.current.frequency.value = freq;
      setActiveFreq(Math.round(freq));
      sweepAnimRef.current = requestAnimationFrame(animate);
    };
    sweepAnimRef.current = requestAnimationFrame(animate);
  }, [amplitude, stopAll]);

  // Update gain when level changes during playback
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = amplitude;
  }, [amplitude]);

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        {/* Controls */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Level: {level[0]} dBFS</Label>
              <Slider min={-60} max={0} step={1} value={level} onValueChange={setLevel} className="mt-2 w-48" />
            </div>
            {activeFreq && (
              <div className="text-center">
                <p className="text-4xl font-heading font-bold text-primary">{activeFreq} Hz</p>
                <p className="text-xs text-muted-foreground">{level[0]} dBFS</p>
              </div>
            )}
          </div>

          {playing && (
            <Button onClick={stopAll} variant="destructive" className="gap-2 w-full">
              <Square className="h-4 w-4" /> Stop
            </Button>
          )}
        </div>

        {/* Frequency Steps */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="text-sm font-heading font-semibold">Frequency Steps</h2>
          <p className="text-xs text-muted-foreground">Tap a frequency to play a continuous tone. Listen for rolloff and resonances.</p>
          <div className="flex flex-wrap gap-2">
            {FREQ_STEPS.map((freq) => (
              <Button
                key={freq}
                size="sm"
                variant={activeFreq === freq && !sweeping ? 'default' : 'outline'}
                onClick={() => activeFreq === freq && !sweeping ? stopAll() : playFreq(freq)}
                disabled={sweeping}
                className="min-w-[4rem]"
              >
                {freq} Hz
              </Button>
            ))}
          </div>
        </div>

        {/* Sweep */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="text-sm font-heading font-semibold">Bass Sweep (10–200 Hz)</h2>
          <p className="text-xs text-muted-foreground">Logarithmic sweep to find your subwoofer's rolloff point and room resonances.</p>
          <Button onClick={startSweep} disabled={playing} className="gap-2">
            <Play className="h-4 w-4" /> Start Sweep
          </Button>
        </div>

        {/* Crossover Finder */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="text-sm font-heading font-semibold">Crossover Finder (40–160 Hz)</h2>
          <p className="text-xs text-muted-foreground">
            Linear sweep through the crossover region. Listen for the handoff between sub and mains.
            Your current crossover is set to {crossoverFreq[0]} Hz.
          </p>
          <div>
            <Label className="text-xs">Reference crossover: {crossoverFreq[0]} Hz</Label>
            <Slider min={40} max={160} step={5} value={crossoverFreq} onValueChange={setCrossoverFreq} className="mt-2 max-w-xs" />
          </div>
          <Button onClick={startCrossoverSweep} disabled={playing} className="gap-2">
            <Play className="h-4 w-4" /> Sweep Crossover Region
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          ⚠️ Low frequencies can be very loud. Start at a low level and increase gradually. Protect your ears and equipment.
        </p>
      </div>
    </ToolPage>
  );
};

export default SubwooferTest;
