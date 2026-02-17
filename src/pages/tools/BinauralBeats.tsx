import { useState, useRef, useCallback, useEffect } from 'react';
import { getToolById } from '@/config/tool-registry';
import { ToolPage } from '@/components/shared/ToolPage';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Volume2, Timer } from 'lucide-react';
import { registerCallback, unregisterCallback, notifyPlayStart } from '@/lib/playback-manager';

const tool = getToolById('binaural-beats')!;

const BANDS = [
  { name: 'Delta', range: [1, 4], color: 'bg-purple-500', desc: 'Deep sleep, healing' },
  { name: 'Theta', range: [4, 8], color: 'bg-blue-500', desc: 'Meditation, creativity' },
  { name: 'Alpha', range: [8, 14], color: 'bg-green-500', desc: 'Relaxation, calm focus' },
  { name: 'Beta', range: [14, 30], color: 'bg-yellow-500', desc: 'Active thinking, focus' },
  { name: 'Gamma', range: [30, 40], color: 'bg-red-500', desc: 'Peak awareness, insight' },
];

function getBandForFreq(freq: number) {
  return BANDS.find(b => freq >= b.range[0] && freq <= b.range[1]) || BANDS[0];
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function BinauralBeats() {
  const [baseFreq, setBaseFreq] = useState(200);
  const [beatFreq, setBeatFreq] = useState(10);
  const [volume, setVolume] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timerMin, setTimerMin] = useState(15);
  const [elapsed, setElapsed] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const oscLRef = useRef<OscillatorNode | null>(null);
  const oscRRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number>(0);

  const currentBand = getBandForFreq(beatFreq);

  const stop = useCallback(() => {
    oscLRef.current?.stop();
    oscRRef.current?.stop();
    ctxRef.current?.close();
    oscLRef.current = null;
    oscRRef.current = null;
    ctxRef.current = null;
    gainRef.current = null;
    clearInterval(timerRef.current);
    setIsPlaying(false);
    setElapsed(0);
  }, []);

  const start = useCallback(() => {
    notifyPlayStart('binaural-beats');
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const merger = ctx.createChannelMerger(2);
    const gain = ctx.createGain();
    gain.gain.value = volume / 100;
    gainRef.current = gain;

    const oscL = ctx.createOscillator();
    oscL.frequency.value = baseFreq;
    const oscR = ctx.createOscillator();
    oscR.frequency.value = baseFreq + beatFreq;

    oscL.connect(merger, 0, 0);
    oscR.connect(merger, 0, 1);
    merger.connect(gain);
    gain.connect(ctx.destination);

    oscL.start();
    oscR.start();
    oscLRef.current = oscL;
    oscRRef.current = oscR;

    setIsPlaying(true);
    setElapsed(0);

    const startTime = Date.now();
    const totalMs = timerMin * 60 * 1000;
    timerRef.current = window.setInterval(() => {
      const e = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(e);
      if (Date.now() - startTime >= totalMs) {
        stop();
      }
    }, 1000);
  }, [baseFreq, beatFreq, volume, timerMin, stop]);

  // Live update params
  useEffect(() => {
    if (oscLRef.current) oscLRef.current.frequency.value = baseFreq;
    if (oscRRef.current) oscRRef.current.frequency.value = baseFreq + beatFreq;
  }, [baseFreq, beatFreq]);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume / 100;
  }, [volume]);

  useEffect(() => {
    registerCallback('binaural-beats', stop);
    return () => { stop(); unregisterCallback('binaural-beats'); };
  }, [stop]);

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        {/* Band indicator */}
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <Badge className={`${currentBand.color} text-white text-sm px-3 py-1`}>
              {currentBand.name} ({currentBand.range[0]}–{currentBand.range[1]} Hz)
            </Badge>
            <p className="text-sm text-muted-foreground">{currentBand.desc}</p>
            <p className="text-2xl font-heading font-bold">
              {baseFreq} Hz L / {baseFreq + beatFreq} Hz R
            </p>
            <p className="text-muted-foreground">Beat frequency: {beatFreq} Hz</p>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card>
          <CardHeader><CardTitle className="text-base">Controls</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Base Frequency: {baseFreq} Hz</label>
              <Slider min={100} max={500} step={1} value={[baseFreq]} onValueChange={([v]) => setBaseFreq(v)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Beat Frequency: {beatFreq} Hz</label>
              <Slider min={1} max={40} step={0.5} value={[beatFreq]} onValueChange={([v]) => setBeatFreq(v)} />
              <div className="flex flex-wrap gap-1 mt-2">
                {BANDS.map(b => (
                  <Button key={b.name} size="sm" variant="outline"
                    className={beatFreq >= b.range[0] && beatFreq <= b.range[1] ? 'border-primary' : ''}
                    onClick={() => setBeatFreq((b.range[0] + b.range[1]) / 2)}>
                    {b.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Slider min={1} max={80} step={1} value={[volume]} onValueChange={([v]) => setVolume(v)} className="flex-1" />
              <span className="text-sm w-10 text-right">{volume}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <Slider min={1} max={60} step={1} value={[timerMin]} onValueChange={([v]) => setTimerMin(v)} className="flex-1" disabled={isPlaying} />
              <span className="text-sm w-14 text-right">{timerMin} min</span>
            </div>
          </CardContent>
        </Card>

        {/* Playback */}
        <div className="flex items-center gap-4">
          <Button size="lg" onClick={isPlaying ? stop : start}>
            {isPlaying ? <><Square className="h-4 w-4 mr-2" /> Stop</> : <><Play className="h-4 w-4 mr-2" /> Start Session</>}
          </Button>
          {isPlaying && (
            <span className="text-sm text-muted-foreground font-mono">
              {formatTime(elapsed)} / {formatTime(timerMin * 60)}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          ⚠️ Use stereo headphones for binaural beats to work. Speakers will mix the channels and eliminate the effect. Keep volume at a comfortable level.
        </p>
      </div>
    </ToolPage>
  );
}
