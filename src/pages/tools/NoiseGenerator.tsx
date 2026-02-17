import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { generateNoise } from '@/engines/analysis/generators/noise';
import { encodeWav } from '@/engines/analysis/generators/wav-encoder';
import { Play, Square } from 'lucide-react';

const tool = getToolById('noise-generator')!;

const NoiseGenerator = () => {
  const [noiseType, setNoiseType] = useState<'white' | 'pink' | 'brown' | 'blue' | 'violet' | 'grey'>('white');
  const [level, setLevel] = useState([-20]);
  const [playing, setPlaying] = useState(false);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playingRef = useRef(false);

  const amplitude = Math.pow(10, level[0] / 20);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); } catch {}
      audioCtxRef.current?.close();
    };
  }, []);

  const startPlayback = useCallback(() => {
    const ctx = new AudioContext();
    const sr = ctx.sampleRate;
    const duration = 30;
    const buffer = ctx.createBuffer(1, sr * duration, sr);
    const data = generateNoise(duration, sr, noiseType, amplitude);
    buffer.getChannelData(0).set(data);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(ctx.destination);
    source.start();

    audioCtxRef.current = ctx;
    sourceRef.current = source;
    playingRef.current = true;
    setPlaying(true);
  }, [noiseType, amplitude]);

  const stopPlayback = useCallback(() => {
    try { sourceRef.current?.stop(); } catch {}
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    sourceRef.current = null;
    playingRef.current = false;
    setPlaying(false);
  }, []);

  // Auto-restart when params change while playing
  useEffect(() => {
    if (playingRef.current) {
      stopPlayback();
      // Small delay to let AudioContext close cleanly
      const t = setTimeout(() => startPlayback(), 50);
      return () => clearTimeout(t);
    }
  }, [noiseType, amplitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = useCallback(() => {
    const buffer = generateNoise(10, 44100, noiseType, amplitude);
    const blob = encodeWav([buffer], 44100, 16);
    setDownloadBlob(blob);
  }, [noiseType, amplitude]);

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Noise Type</Label>
              <Select value={noiseType} onValueChange={(v: any) => setNoiseType(v)}>
                <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White Noise</SelectItem>
                  <SelectItem value="pink">Pink Noise</SelectItem>
                  <SelectItem value="brown">Brown Noise</SelectItem>
                  <SelectItem value="blue">Blue Noise</SelectItem>
                  <SelectItem value="violet">Violet Noise</SelectItem>
                  <SelectItem value="grey">Grey Noise</SelectItem>
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
              <p className="text-2xl font-heading font-bold text-primary capitalize">{noiseType} Noise</p>
              <p className="text-sm text-muted-foreground mt-1">{level[0]} dBFS</p>
            </div>
            <div className="flex gap-2">
              {!playing ? (
                <Button onClick={startPlayback} className="gap-2"><Play className="h-4 w-4" /> Play</Button>
              ) : (
                <Button onClick={stopPlayback} variant="destructive" className="gap-2"><Square className="h-4 w-4" /> Stop</Button>
              )}
              <Button onClick={handleDownload} variant="outline">Generate WAV</Button>
            </div>
            {downloadBlob && (
              <DownloadButton blob={downloadBlob} filename={`${noiseType}-noise.wav`} label="Download WAV" />
            )}
          </div>
        </div>
      </div>
    </ToolPage>
  );
};

export default NoiseGenerator;
