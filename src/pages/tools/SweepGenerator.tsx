import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { generateSweep } from '@/engines/analysis/generators/sweep';
import { encodeWav } from '@/engines/analysis/generators/wav-encoder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Play, Square } from 'lucide-react';

const tool = getToolById('sweep-generator')!;

const SweepGenerator = () => {
  const [startFreq, setStartFreq] = useState(20);
  const [endFreq, setEndFreq] = useState(20000);
  const [duration, setDuration] = useState(5);
  const [sweepType, setSweepType] = useState<'linear' | 'logarithmic'>('logarithmic');
  const [amplitude, setAmplitude] = useState(80);
  const [playing, setPlaying] = useState(false);
  const [wavBlob, setWavBlob] = useState<Blob | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); } catch {}
      audioCtxRef.current?.close();
    };
  }, []);

  const play = useCallback(() => {
    if (playing) {
      try { sourceRef.current?.stop(); } catch {}
      setPlaying(false);
      return;
    }

    const ctx = audioCtxRef.current || new AudioContext();
    audioCtxRef.current = ctx;

    const samples = generateSweep(startFreq, endFreq, duration, ctx.sampleRate, sweepType, amplitude / 100);
    const audioBuffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    audioBuffer.getChannelData(0).set(samples);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => setPlaying(false);
    source.start();
    sourceRef.current = source;
    setPlaying(true);
  }, [startFreq, endFreq, duration, sweepType, amplitude, playing]);

  const generateWav = useCallback(() => {
    const samples = generateSweep(startFreq, endFreq, duration, 44100, sweepType, amplitude / 100);
    const wavData = encodeWav([samples], 44100);
    setWavBlob(wavData);
  }, [startFreq, endFreq, duration, sweepType, amplitude]);

  return (
    <ToolPage tool={tool}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium">Start Frequency (Hz)</label>
            <Input type="number" min={1} max={20000} value={startFreq} onChange={(e) => setStartFreq(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">End Frequency (Hz)</label>
            <Input type="number" min={1} max={20000} value={endFreq} onChange={(e) => setEndFreq(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Duration (s)</label>
            <Input type="number" min={0.5} max={60} step={0.5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Sweep Type</label>
            <Select value={sweepType} onValueChange={(v) => setSweepType(v as 'linear' | 'logarithmic')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="logarithmic">Logarithmic</SelectItem>
                <SelectItem value="linear">Linear</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium">Volume: {amplitude}%</label>
          <Slider min={1} max={100} value={[amplitude]} onValueChange={([v]) => setAmplitude(v)} />
        </div>

        <div className="flex gap-3">
          <Button onClick={play} variant={playing ? 'destructive' : 'default'}>
            {playing ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {playing ? 'Stop' : 'Play Sweep'}
          </Button>
          <Button variant="outline" onClick={generateWav}>Generate WAV</Button>
        </div>

        {wavBlob && (
          <DownloadButton blob={wavBlob} filename={`sweep_${startFreq}-${endFreq}Hz_${duration}s.wav`} label="Download WAV" />
        )}
      </div>
    </ToolPage>
  );
};
export default SweepGenerator;
