import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { generateTone } from '@/engines/analysis/generators/tone';
import { encodeWav } from '@/engines/analysis/generators/wav-encoder';
import { Play, Square } from 'lucide-react';

const tool = getToolById('tone-generator')!;

const ToneGenerator = () => {
  const [frequency, setFrequency] = useState(440);
  const [waveform, setWaveform] = useState<'sine' | 'square' | 'triangle' | 'sawtooth'>('sine');
  const [level, setLevel] = useState([-12]);
  const [playing, setPlaying] = useState(false);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const amplitude = Math.pow(10, level[0] / 20);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      oscRef.current?.stop();
      audioCtxRef.current?.close();
    };
  }, []);

  const startPlayback = useCallback(() => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveform;
    osc.frequency.value = frequency;
    gain.gain.value = amplitude;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    audioCtxRef.current = ctx;
    oscRef.current = osc;
    gainRef.current = gain;
    setPlaying(true);
  }, [frequency, waveform, amplitude]);

  const stopPlayback = useCallback(() => {
    oscRef.current?.stop();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    oscRef.current = null;
    setPlaying(false);
  }, []);

  const handleDownload = useCallback(() => {
    const buffer = generateTone(frequency, 5, 44100, waveform, amplitude);
    const blob = encodeWav([buffer], 44100, 16);
    setDownloadBlob(blob);
  }, [frequency, waveform, amplitude]);

  // Update live oscillator when params change
  if (oscRef.current && playing) {
    oscRef.current.frequency.value = frequency;
    oscRef.current.type = waveform;
    if (gainRef.current) gainRef.current.gain.value = amplitude;
  }

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Frequency (Hz)</Label>
              <Input
                type="number"
                min={20}
                max={20000}
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="bg-secondary"
              />
            </div>
            <div>
              <Label className="text-xs">Waveform</Label>
              <Select value={waveform} onValueChange={(v: any) => setWaveform(v)}>
                <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sine">Sine</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="triangle">Triangle</SelectItem>
                  <SelectItem value="sawtooth">Sawtooth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Level: {level[0]} dBFS</Label>
              <Slider min={-60} max={0} step={1} value={level} onValueChange={setLevel} className="mt-2" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-heading font-bold text-primary">{frequency} Hz</p>
              <p className="text-sm text-muted-foreground mt-1 capitalize">{waveform} wave • {level[0]} dBFS</p>
            </div>
            <div className="flex gap-2">
              {!playing ? (
                <Button onClick={startPlayback} className="gap-2">
                  <Play className="h-4 w-4" /> Play
                </Button>
              ) : (
                <Button onClick={stopPlayback} variant="destructive" className="gap-2">
                  <Square className="h-4 w-4" /> Stop
                </Button>
              )}
              <Button onClick={handleDownload} variant="outline">
                Generate WAV
              </Button>
            </div>
            {downloadBlob && (
              <DownloadButton blob={downloadBlob} filename={`tone-${frequency}hz-${waveform}.wav`} label="Download WAV" />
            )}
          </div>
        </div>
      </div>
    </ToolPage>
  );
};

export default ToneGenerator;
