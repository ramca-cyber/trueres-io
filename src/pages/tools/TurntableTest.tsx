import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { encodeWav } from '@/engines/analysis/generators/wav-encoder';
import { Play, Square } from 'lucide-react';

const tool = getToolById('turntable-test')!;

interface TestDef {
  id: string;
  name: string;
  desc: string;
  freq: number;
  stereo: 'both' | 'left' | 'right';
  duration: number;
}

const TESTS: TestDef[] = [
  {
    id: 'wow-flutter',
    name: 'Wow & Flutter (3150 Hz)',
    desc: 'Standard test tone for measuring speed stability. Listen for pitch wobble.',
    freq: 3150,
    stereo: 'both',
    duration: 30,
  },
  {
    id: 'speed-33',
    name: 'Speed Check — 33⅓ RPM (3150 Hz)',
    desc: 'Play this tone and use a frequency counter or tuner to verify exact 3150 Hz output.',
    freq: 3150,
    stereo: 'both',
    duration: 15,
  },
  {
    id: 'speed-45',
    name: 'Speed Check — 45 RPM (3150 Hz)',
    desc: 'Same tone for 45 RPM records. Verify pitch is correct when playing at 45.',
    freq: 3150,
    stereo: 'both',
    duration: 15,
  },
  {
    id: 'anti-skate',
    name: 'Anti-Skating Bias (315 Hz, Left Only)',
    desc: 'Left-channel-only tone. If both channels produce sound, anti-skate needs adjustment.',
    freq: 315,
    stereo: 'left',
    duration: 15,
  },
  {
    id: 'tracking-1k',
    name: 'Tracking Test (1 kHz)',
    desc: 'Listen for distortion or buzzing that indicates tracking force issues.',
    freq: 1000,
    stereo: 'both',
    duration: 10,
  },
  {
    id: 'channel-balance',
    name: 'Channel Balance (1 kHz, L then R)',
    desc: 'Plays in left then right to check cartridge balance.',
    freq: 1000,
    stereo: 'both', // handled specially
    duration: 10,
  },
];

const TurntableTest = () => {
  const [level, setLevel] = useState([-12]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<{ id: string; blob: Blob } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | OscillatorNode | null>(null);

  const amplitude = Math.pow(10, level[0] / 20);

  useEffect(() => {
    return () => {
      try { (sourceRef.current as any)?.stop?.(); } catch {}
      audioCtxRef.current?.close();
    };
  }, []);

  const stopAll = useCallback(() => {
    try { (sourceRef.current as any)?.stop?.(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    sourceRef.current = null;
    setPlaying(null);
  }, []);

  const playTest = useCallback((test: TestDef) => {
    stopAll();
    const ctx = new AudioContext();
    const sr = ctx.sampleRate;
    audioCtxRef.current = ctx;

    if (test.id === 'channel-balance') {
      // L then R
      const dur = test.duration;
      const half = Math.floor(dur / 2);
      const buf = ctx.createBuffer(2, sr * dur, sr);
      const left = buf.getChannelData(0);
      const right = buf.getChannelData(1);
      for (let i = 0; i < sr * half; i++) {
        left[i] = amplitude * Math.sin(2 * Math.PI * test.freq * i / sr);
      }
      for (let i = sr * half; i < sr * dur; i++) {
        right[i] = amplitude * Math.sin(2 * Math.PI * test.freq * i / sr);
      }
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(ctx.destination);
      source.onended = () => setPlaying(null);
      source.start();
      sourceRef.current = source;
    } else if (test.stereo === 'left') {
      const buf = ctx.createBuffer(2, sr * test.duration, sr);
      const left = buf.getChannelData(0);
      for (let i = 0; i < left.length; i++) {
        left[i] = amplitude * Math.sin(2 * Math.PI * test.freq * i / sr);
      }
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(ctx.destination);
      source.onended = () => setPlaying(null);
      source.start();
      sourceRef.current = source;
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = test.freq;
      gain.gain.value = amplitude;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + test.duration);
      osc.onended = () => setPlaying(null);
      sourceRef.current = osc;
    }

    setPlaying(test.id);
  }, [amplitude, stopAll]);

  const generateWav = useCallback((test: TestDef) => {
    const sr = 44100;
    if (test.stereo === 'left' || test.id === 'channel-balance') {
      const left = new Float32Array(sr * test.duration);
      const right = new Float32Array(sr * test.duration);
      if (test.id === 'channel-balance') {
        const half = Math.floor(test.duration / 2);
        for (let i = 0; i < sr * half; i++) left[i] = amplitude * Math.sin(2 * Math.PI * test.freq * i / sr);
        for (let i = sr * half; i < sr * test.duration; i++) right[i] = amplitude * Math.sin(2 * Math.PI * test.freq * i / sr);
      } else {
        for (let i = 0; i < left.length; i++) left[i] = amplitude * Math.sin(2 * Math.PI * test.freq * i / sr);
      }
      const blob = encodeWav([left, right], sr, 16);
      setDownloadBlob({ id: test.id, blob });
    } else {
      const data = new Float32Array(sr * test.duration);
      for (let i = 0; i < data.length; i++) data[i] = amplitude * Math.sin(2 * Math.PI * test.freq * i / sr);
      const blob = encodeWav([data], sr, 16);
      setDownloadBlob({ id: test.id, blob });
    }
  }, [amplitude]);

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <Label className="text-xs">Level: {level[0]} dBFS</Label>
          <Slider min={-40} max={0} step={1} value={level} onValueChange={setLevel} className="max-w-xs" />
        </div>

        <div className="space-y-3">
          {TESTS.map((test) => (
            <div key={test.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{test.name}</p>
                  <p className="text-xs text-muted-foreground">{test.desc}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant={playing === test.id ? 'destructive' : 'outline'}
                    onClick={playing === test.id ? stopAll : () => playTest(test)}
                    disabled={playing !== null && playing !== test.id}
                  >
                    {playing === test.id ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => generateWav(test)}>
                    WAV
                  </Button>
                </div>
              </div>
              {downloadBlob?.id === test.id && (
                <DownloadButton blob={downloadBlob.blob} filename={`turntable-${test.id}.wav`} label="Download" />
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          These test tones are designed to be burned to a CD-R or played from a digital source to test your turntable's mechanical performance.
        </p>
      </div>
    </ToolPage>
  );
};

export default TurntableTest;
