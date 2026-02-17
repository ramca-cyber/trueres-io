import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Play, Square, CheckCircle } from 'lucide-react';

const tool = getToolById('speaker-test')!;

interface ChannelDef {
  id: string;
  name: string;
  short: string;
  angle: number; // degrees from front center
  index: number; // Web Audio channel index
}

const STEREO_CHANNELS: ChannelDef[] = [
  { id: 'left', name: 'Front Left', short: 'FL', angle: -30, index: 0 },
  { id: 'right', name: 'Front Right', short: 'FR', angle: 30, index: 1 },
];

const SURROUND_51: ChannelDef[] = [
  { id: 'fl', name: 'Front Left', short: 'FL', angle: -30, index: 0 },
  { id: 'fr', name: 'Front Right', short: 'FR', angle: 30, index: 1 },
  { id: 'center', name: 'Center', short: 'C', angle: 0, index: 2 },
  { id: 'lfe', name: 'Subwoofer (LFE)', short: 'LFE', angle: 0, index: 3 },
  { id: 'rl', name: 'Rear Left', short: 'RL', angle: -110, index: 4 },
  { id: 'rr', name: 'Rear Right', short: 'RR', angle: 110, index: 5 },
];

const SURROUND_71: ChannelDef[] = [
  ...SURROUND_51,
  { id: 'sl', name: 'Side Left', short: 'SL', angle: -90, index: 6 },
  { id: 'sr', name: 'Side Right', short: 'SR', angle: 90, index: 7 },
];

function getSpeakerPosition(angle: number, isLFE: boolean) {
  if (isLFE) return { left: '50%', top: '65%' };
  const rad = ((angle - 90) * Math.PI) / 180;
  const r = 38;
  const x = 50 + r * Math.cos(rad);
  const y = 50 + r * Math.sin(rad);
  return { left: `${x}%`, top: `${y}%` };
}

const SpeakerTest = () => {
  const [mode, setMode] = useState<'stereo' | '5.1' | '7.1'>('stereo');
  const [level, setLevel] = useState([-12]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [polarityPlaying, setPolarityPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<OscillatorNode | null>(null);

  const amplitude = Math.pow(10, level[0] / 20);

  const channels = mode === '7.1' ? SURROUND_71 : mode === '5.1' ? SURROUND_51 : STEREO_CHANNELS;

  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); } catch {}
      audioCtxRef.current?.close();
    };
  }, []);

  const stopAll = useCallback(() => {
    try { sourceRef.current?.stop(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    sourceRef.current = null;
    setPlaying(false);
    setPolarityPlaying(false);
    setActiveChannel(null);
  }, []);

  const playChannel = useCallback((ch: ChannelDef) => {
    stopAll();
    const channelCount = mode === '7.1' ? 8 : mode === '5.1' ? 6 : 2;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ch.id === 'lfe' ? 60 : 440;
    gain.gain.value = amplitude;
    osc.connect(gain);

    // For stereo, simple panning
    if (channelCount === 2) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = ch.index === 0 ? -1 : 1;
      gain.connect(panner).connect(ctx.destination);
    } else {
      // Multichannel: use ChannelMergerNode
      const merger = ctx.createChannelMerger(channelCount);
      gain.connect(merger, 0, ch.index);
      merger.connect(ctx.destination);
    }

    osc.start();
    osc.onended = () => { setPlaying(false); setActiveChannel(null); };
    setTimeout(() => { try { osc.stop(); } catch {} }, 2000);

    audioCtxRef.current = ctx;
    sourceRef.current = osc;
    setPlaying(true);
    setActiveChannel(ch.id);
  }, [mode, amplitude, stopAll]);

  const playSequence = useCallback(async () => {
    stopAll();
    setPlaying(true);
    for (const ch of channels) {
      if (!document.hasFocus()) break;
      await new Promise<void>((resolve) => {
        const channelCount = mode === '7.1' ? 8 : mode === '5.1' ? 6 : 2;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = ch.id === 'lfe' ? 60 : 440;
        gain.gain.value = amplitude;
        osc.connect(gain);

        if (channelCount === 2) {
          const panner = ctx.createStereoPanner();
          panner.pan.value = ch.index === 0 ? -1 : 1;
          gain.connect(panner).connect(ctx.destination);
        } else {
          const merger = ctx.createChannelMerger(channelCount);
          gain.connect(merger, 0, ch.index);
          merger.connect(ctx.destination);
        }

        osc.start();
        setActiveChannel(ch.id);
        setTimeout(() => {
          try { osc.stop(); } catch {}
          ctx.close();
          resolve();
        }, 1500);
      });
      await new Promise(r => setTimeout(r, 300));
    }
    setPlaying(false);
    setActiveChannel(null);
  }, [channels, mode, amplitude, stopAll]);

  const playPolarity = useCallback((inPhase: boolean) => {
    stopAll();
    setPolarityPlaying(true);
    const ctx = new AudioContext();
    const sr = ctx.sampleRate;
    const dur = 2;
    const buf = ctx.createBuffer(2, sr * dur, sr);
    const left = buf.getChannelData(0);
    const right = buf.getChannelData(1);
    for (let i = 0; i < sr * dur; i++) {
      const val = amplitude * Math.sin(2 * Math.PI * 200 * i / sr);
      left[i] = val;
      right[i] = inPhase ? val : -val;
    }
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);
    source.onended = () => setPolarityPlaying(false);
    source.start();
    audioCtxRef.current = ctx;
  }, [amplitude, stopAll]);

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <Tabs value={mode} onValueChange={(v: any) => { stopAll(); setMode(v); }}>
            <TabsList>
              <TabsTrigger value="stereo">Stereo (2.0)</TabsTrigger>
              <TabsTrigger value="5.1">5.1 Surround</TabsTrigger>
              <TabsTrigger value="7.1">7.1 Surround</TabsTrigger>
            </TabsList>
          </Tabs>

          <div>
            <Label className="text-xs">Level: {level[0]} dBFS</Label>
            <Slider min={-60} max={0} step={1} value={level} onValueChange={setLevel} className="mt-2 max-w-xs" />
          </div>

          {/* Speaker Layout Visualization */}
          <div className="relative w-full max-w-sm mx-auto aspect-square">
            <div className="absolute inset-0 rounded-full border border-border/50" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-muted-foreground/30" title="Listening position" />
            {channels.map((ch) => {
              const pos = getSpeakerPosition(ch.angle, ch.id === 'lfe');
              const isActive = activeChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => playChannel(ch)}
                  disabled={playing && activeChannel !== ch.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary scale-125 shadow-lg'
                      : 'bg-card text-foreground border-border hover:border-primary/60'
                  }`}
                  style={{ left: pos.left, top: pos.top }}
                  title={`Play ${ch.name}`}
                >
                  {ch.short}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={playSequence} disabled={playing} className="gap-2">
              <Play className="h-4 w-4" /> Play All Channels
            </Button>
            {playing && (
              <Button onClick={stopAll} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" /> Stop
              </Button>
            )}
          </div>
        </div>

        {/* Polarity Check */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="text-sm font-heading font-semibold">Polarity / Phase Check</h2>
          <p className="text-xs text-muted-foreground">
            In-phase: sound appears centered. Out-of-phase: sound appears diffuse/thin — indicates reversed speaker wiring.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => playPolarity(true)} disabled={polarityPlaying}>
              <CheckCircle className="h-3 w-3 mr-1" /> In-Phase (Normal)
            </Button>
            <Button size="sm" variant="outline" onClick={() => playPolarity(false)} disabled={polarityPlaying}>
              Out-of-Phase (Reversed)
            </Button>
          </div>
        </div>

        {mode !== 'stereo' && (
          <p className="text-xs text-muted-foreground text-center">
            Surround output requires your system audio to be configured for multichannel. Works best in Chrome/Edge with a surround receiver.
          </p>
        )}
      </div>
    </ToolPage>
  );
};

export default SpeakerTest;
