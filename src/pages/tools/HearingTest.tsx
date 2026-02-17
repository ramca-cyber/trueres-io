import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Square, Volume2 } from 'lucide-react';
import { registerCallback, unregisterCallback, notifyPlayStart } from '@/lib/playback-manager';

const tool = getToolById('hearing-test')!;

const TEST_FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000, 12000, 16000];

const HearingTest = () => {
  const [started, setStarted] = useState(false);
  const [currentFreqIdx, setCurrentFreqIdx] = useState(0);
  const [volume, setVolume] = useState(50);
  const [results, setResults] = useState<Record<number, number>>({});
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    registerCallback('hearing-test', stopTone);
    return () => {
      try { oscRef.current?.stop(); } catch {}
      audioCtxRef.current?.close();
      unregisterCallback('hearing-test');
    };
  }, []);

  const playTone = useCallback((freq: number, vol: number) => {
    notifyPlayStart('hearing-test');
    const ctx = audioCtxRef.current || new AudioContext();
    audioCtxRef.current = ctx;

    // Stop previous
    try { oscRef.current?.stop(); } catch {}

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = (vol / 100) * 0.5;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    oscRef.current = osc;
    gainRef.current = gain;
    setPlaying(true);
  }, []);

  const stopTone = useCallback(() => {
    try { oscRef.current?.stop(); } catch {}
    oscRef.current = null;
    setPlaying(false);
  }, []);

  const handleCanHear = useCallback(() => {
    stopTone();
    const freq = TEST_FREQUENCIES[currentFreqIdx];
    setResults((prev) => ({ ...prev, [freq]: volume }));

    if (currentFreqIdx < TEST_FREQUENCIES.length - 1) {
      setCurrentFreqIdx((i) => i + 1);
      setVolume(50);
    } else {
      setFinished(true);
    }
  }, [currentFreqIdx, volume, stopTone]);

  const handleCantHear = useCallback(() => {
    stopTone();
    const freq = TEST_FREQUENCIES[currentFreqIdx];
    setResults((prev) => ({ ...prev, [freq]: -1 }));

    if (currentFreqIdx < TEST_FREQUENCIES.length - 1) {
      setCurrentFreqIdx((i) => i + 1);
      setVolume(50);
    } else {
      setFinished(true);
    }
  }, [currentFreqIdx, stopTone]);

  if (!started) {
    return (
      <ToolPage tool={tool}>
        <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
          <Volume2 className="h-12 w-12 mx-auto text-primary" />
          <h2 className="text-lg font-heading font-semibold">Hearing Frequency Test</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This test plays tones at different frequencies. For each tone, adjust the volume until you can just barely hear it. 
            Use headphones for the most accurate results.
          </p>
          <p className="text-xs text-destructive font-medium">⚠️ Start at a low volume to protect your hearing.</p>
          <Button onClick={() => setStarted(true)} size="lg">Begin Test</Button>
        </div>
      </ToolPage>
    );
  }

  if (finished) {
    return (
      <ToolPage tool={tool}>
        <div className="space-y-4">
          <h2 className="text-lg font-heading font-semibold">Your Results</h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {TEST_FREQUENCIES.map((freq) => (
                <div key={freq} className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground">{freq >= 1000 ? `${freq / 1000}k` : freq} Hz</p>
                  <div className={`text-sm font-mono font-bold ${
                    results[freq] === -1 ? 'text-destructive' :
                    results[freq] <= 30 ? 'text-status-pass' :
                    results[freq] <= 60 ? 'text-status-warn' : 'text-destructive'
                  }`}>
                    {results[freq] === -1 ? '✗' : `${results[freq]}%`}
                  </div>
                  <div className="w-full bg-secondary rounded-full h-16 relative">
                    <div
                      className={`absolute bottom-0 w-full rounded-full ${
                        results[freq] === -1 ? 'bg-destructive/50' :
                        results[freq] <= 30 ? 'bg-status-pass' :
                        results[freq] <= 60 ? 'bg-status-warn' : 'bg-destructive'
                      }`}
                      style={{ height: `${results[freq] === -1 ? 100 : results[freq]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Lower volume thresholds = better hearing at that frequency. This is not a medical test.
          </p>
          <Button variant="outline" onClick={() => { setStarted(false); setFinished(false); setCurrentFreqIdx(0); setResults({}); setVolume(50); }}>
            Retake Test
          </Button>
        </div>
      </ToolPage>
    );
  }

  const freq = TEST_FREQUENCIES[currentFreqIdx];

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Test {currentFreqIdx + 1} of {TEST_FREQUENCIES.length}</p>
          <p className="text-3xl font-heading font-bold mt-2">{freq >= 1000 ? `${freq / 1000}k` : freq} Hz</p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Volume: {volume}%</label>
          <Slider min={1} max={100} value={[volume]} onValueChange={([v]) => {
            setVolume(v);
            if (gainRef.current) gainRef.current.gain.value = (v / 100) * 0.5;
          }} />
        </div>

        <div className="flex justify-center gap-3">
          <Button onClick={() => playing ? stopTone() : playTone(freq, volume)} variant={playing ? 'destructive' : 'default'}>
            {playing ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {playing ? 'Stop' : 'Play Tone'}
          </Button>
        </div>

        <div className="flex justify-center gap-3">
          <Button onClick={handleCanHear} variant="outline" className="border-status-pass text-status-pass">
            I can hear it
          </Button>
          <Button onClick={handleCantHear} variant="outline" className="border-destructive text-destructive">
            I can't hear it
          </Button>
        </div>
      </div>
    </ToolPage>
  );
};
export default HearingTest;
