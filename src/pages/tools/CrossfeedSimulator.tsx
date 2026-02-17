import { useState, useRef, useCallback, useEffect } from 'react';
import { getToolById } from '@/config/tool-registry';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Square, FileAudio } from 'lucide-react';

const tool = getToolById('crossfeed')!;

const PRESETS = [
  { name: 'Subtle', level: 20, delay: 150, cutoff: 700 },
  { name: 'Natural', level: 40, delay: 300, cutoff: 600 },
  { name: 'Wide', level: 65, delay: 500, cutoff: 500 },
];

export default function CrossfeedSimulator() {
  const [file, setFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [level, setLevel] = useState(40);
  const [delay, setDelay] = useState(300);
  const [cutoff, setCutoff] = useState(600);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const crossfeedGainLRef = useRef<GainNode | null>(null);
  const crossfeedGainRRef = useRef<GainNode | null>(null);
  const directGainLRef = useRef<GainNode | null>(null);
  const directGainRRef = useRef<GainNode | null>(null);
  const filterLRef = useRef<BiquadFilterNode | null>(null);
  const filterRRef = useRef<BiquadFilterNode | null>(null);
  const delayLRef = useRef<DelayNode | null>(null);
  const delayRRef = useRef<DelayNode | null>(null);
  const startTimeRef = useRef(0);
  const animRef = useRef<number>(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    sourceRef.current?.stop();
    ctxRef.current?.close();
    sourceRef.current = null;
    ctxRef.current = null;
    setIsPlaying(false);
  }, []);

  const loadFile = useCallback(async (f: File) => {
    setFile(f);
    stop();
    const arrayBuf = await f.arrayBuffer();
    const tempCtx = new AudioContext();
    const decoded = await tempCtx.decodeAudioData(arrayBuf);
    bufferRef.current = decoded;
    setDuration(decoded.duration);
    setCurrentTime(0);
    tempCtx.close();
  }, [stop]);

  const updateCrossfeedParams = useCallback(() => {
    const crossGain = level / 100;
    const directGain = 1 - crossGain * 0.3;
    if (crossfeedGainLRef.current) crossfeedGainLRef.current.gain.value = crossGain;
    if (crossfeedGainRRef.current) crossfeedGainRRef.current.gain.value = crossGain;
    if (directGainLRef.current) directGainLRef.current.gain.value = directGain;
    if (directGainRRef.current) directGainRRef.current.gain.value = directGain;
    if (filterLRef.current) filterLRef.current.frequency.value = cutoff;
    if (filterRRef.current) filterRRef.current.frequency.value = cutoff;
    const delaySec = delay / 1000000;
    if (delayLRef.current) delayLRef.current.delayTime.value = delaySec;
    if (delayRRef.current) delayRRef.current.delayTime.value = delaySec;
  }, [level, delay, cutoff]);

  const start = useCallback(() => {
    if (!bufferRef.current) return;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const source = ctx.createBufferSource();
    source.buffer = bufferRef.current;
    sourceRef.current = source;

    if (enabled && bufferRef.current.numberOfChannels >= 2) {
      // Crossfeed graph
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);

      const filterL = ctx.createBiquadFilter(); filterL.type = 'lowpass'; filterL.frequency.value = cutoff;
      const filterR = ctx.createBiquadFilter(); filterR.type = 'lowpass'; filterR.frequency.value = cutoff;
      filterLRef.current = filterL; filterRRef.current = filterR;

      const delL = ctx.createDelay(0.01); delL.delayTime.value = delay / 1000000;
      const delR = ctx.createDelay(0.01); delR.delayTime.value = delay / 1000000;
      delayLRef.current = delL; delayRRef.current = delR;

      const crossGainVal = level / 100;
      const directGainVal = 1 - crossGainVal * 0.3;

      const cgL = ctx.createGain(); cgL.gain.value = crossGainVal; crossfeedGainLRef.current = cgL;
      const cgR = ctx.createGain(); cgR.gain.value = crossGainVal; crossfeedGainRRef.current = cgR;
      const dgL = ctx.createGain(); dgL.gain.value = directGainVal; directGainLRef.current = dgL;
      const dgR = ctx.createGain(); dgR.gain.value = directGainVal; directGainRRef.current = dgR;

      source.connect(splitter);
      // L direct -> L out
      splitter.connect(dgL, 0); dgL.connect(merger, 0, 0);
      // R direct -> R out
      splitter.connect(dgR, 1); dgR.connect(merger, 0, 1);
      // L cross -> R out
      splitter.connect(filterL, 0); filterL.connect(delL); delL.connect(cgL); cgL.connect(merger, 0, 1);
      // R cross -> L out
      splitter.connect(filterR, 1); filterR.connect(delR); delR.connect(cgR); cgR.connect(merger, 0, 0);

      merger.connect(ctx.destination);
    } else {
      source.connect(ctx.destination);
    }

    source.start();
    startTimeRef.current = ctx.currentTime;
    setIsPlaying(true);

    source.onended = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animRef.current);
    };

    const tick = () => {
      if (ctxRef.current) {
        setCurrentTime(ctxRef.current.currentTime - startTimeRef.current);
      }
      animRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [enabled, level, delay, cutoff]);

  useEffect(() => {
    if (isPlaying) updateCrossfeedParams();
  }, [level, delay, cutoff, isPlaying, updateCrossfeedParams]);

  useEffect(() => () => { stop(); }, [stop]);

  const formatT = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        {!file ? (
          <FileDropZone accept=".wav,.flac,.aiff,.mp3,.ogg,.aac,.m4a" onFileSelect={loadFile}
            label="Drop an audio file" sublabel="WAV, FLAC, MP3, AAC, OGG" />
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <FileAudio className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatT(currentTime)} / {formatT(duration)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { stop(); setFile(null); bufferRef.current = null; }}>
                    Change
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Crossfeed toggle */}
            <div className="flex items-center gap-3">
              <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); if (isPlaying) { stop(); } }} />
              <Label>Crossfeed {enabled ? 'ON' : 'OFF'}</Label>
            </div>

            {/* Presets */}
            <div className="flex gap-2">
              {PRESETS.map(p => (
                <Button key={p.name} size="sm" variant="outline"
                  onClick={() => { setLevel(p.level); setDelay(p.delay); setCutoff(p.cutoff); }}>
                  {p.name}
                </Button>
              ))}
            </div>

            {/* Controls */}
            <Card>
              <CardHeader><CardTitle className="text-base">Crossfeed Parameters</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Level: {level}%</label>
                  <Slider min={0} max={100} step={1} value={[level]} onValueChange={([v]) => setLevel(v)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Delay: {delay} μs</label>
                  <Slider min={0} max={600} step={10} value={[delay]} onValueChange={([v]) => setDelay(v)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">LP Cutoff: {cutoff} Hz</label>
                  <Slider min={200} max={2000} step={10} value={[cutoff]} onValueChange={([v]) => setCutoff(v)} />
                </div>
              </CardContent>
            </Card>

            {/* Play/Stop */}
            <Button size="lg" onClick={isPlaying ? stop : start}>
              {isPlaying ? <><Square className="h-4 w-4 mr-2" /> Stop</> : <><Play className="h-4 w-4 mr-2" /> Play</>}
            </Button>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          🎧 Crossfeed blends a filtered, delayed portion of each channel into the opposite ear, simulating speaker-like crosstalk. Toggle on/off for instant A/B comparison.
        </p>
      </div>
    </ToolPage>
  );
}
