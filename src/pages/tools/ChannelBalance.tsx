import { useState, useRef, useCallback, useEffect } from 'react';
import { getToolById } from '@/config/tool-registry';
import { ToolPage } from '@/components/shared/ToolPage';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RotateCcw } from 'lucide-react';

const tool = getToolById('channel-balance')!;

const TEST_FREQS = [
  { freq: 100, label: '100 Hz (Bass)' },
  { freq: 1000, label: '1 kHz (Mid)' },
  { freq: 4000, label: '4 kHz (Presence)' },
  { freq: 10000, label: '10 kHz (Treble)' },
];

type TestMode = 'alternating' | 'continuous';

export default function ChannelBalance() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<TestMode>('alternating');
  const [activeFreqIdx, setActiveFreqIdx] = useState(0);
  const [balance, setBalance] = useState(0); // -100 (L) to +100 (R)
  const [results, setResults] = useState<Record<number, number>>({});
  const [activeChannel, setActiveChannel] = useState<'L' | 'R'>('L');

  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const panRef = useRef<StereoPannerNode | null>(null);
  const intervalRef = useRef<number>(0);

  const currentFreq = TEST_FREQS[activeFreqIdx].freq;

  const stop = useCallback(() => {
    oscRef.current?.stop();
    ctxRef.current?.close();
    oscRef.current = null;
    ctxRef.current = null;
    panRef.current = null;
    clearInterval(intervalRef.current);
    setIsPlaying(false);
  }, []);

  const start = useCallback(() => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = currentFreq;
    oscRef.current = osc;

    const gain = ctx.createGain();
    gain.gain.value = 0.3;

    const pan = ctx.createStereoPanner();
    pan.pan.value = balance / 100;
    panRef.current = pan;

    osc.connect(gain);
    gain.connect(pan);
    pan.connect(ctx.destination);
    osc.start();

    setIsPlaying(true);

    if (mode === 'alternating') {
      let ch: 'L' | 'R' = 'L';
      setActiveChannel('L');
      pan.pan.value = -1 + (balance / 100);
      intervalRef.current = window.setInterval(() => {
        ch = ch === 'L' ? 'R' : 'L';
        setActiveChannel(ch);
        pan.pan.value = (ch === 'L' ? -1 : 1) + (balance / 100);
      }, 400);
    }
  }, [currentFreq, mode, balance]);

  useEffect(() => {
    if (panRef.current && mode === 'continuous') {
      panRef.current.pan.value = balance / 100;
    }
  }, [balance, mode]);

  useEffect(() => {
    if (oscRef.current) {
      oscRef.current.frequency.value = currentFreq;
    }
  }, [currentFreq]);

  useEffect(() => () => { stop(); }, [stop]);

  const saveResult = () => {
    setResults(prev => ({ ...prev, [currentFreq]: balance }));
    if (activeFreqIdx < TEST_FREQS.length - 1) {
      stop();
      setActiveFreqIdx(i => i + 1);
      setBalance(0);
    }
  };

  const reset = () => {
    stop();
    setResults({});
    setActiveFreqIdx(0);
    setBalance(0);
  };

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        {/* Active test */}
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <div className="flex items-center justify-center gap-8 text-4xl font-heading font-bold">
              <span className={activeChannel === 'L' && isPlaying ? 'text-primary' : 'text-muted-foreground/30'}>L</span>
              <span className="text-base text-muted-foreground">—</span>
              <span className={activeChannel === 'R' && isPlaying ? 'text-primary' : 'text-muted-foreground/30'}>R</span>
            </div>
            <p className="text-lg font-medium">{TEST_FREQS[activeFreqIdx].label}</p>
            <p className="text-sm text-muted-foreground">
              Step {activeFreqIdx + 1} of {TEST_FREQS.length}
            </p>
          </CardContent>
        </Card>

        {/* Mode */}
        <div className="flex gap-2">
          <Button variant={mode === 'alternating' ? 'default' : 'outline'} size="sm"
            onClick={() => { stop(); setMode('alternating'); }}>
            Alternating L/R
          </Button>
          <Button variant={mode === 'continuous' ? 'default' : 'outline'} size="sm"
            onClick={() => { stop(); setMode('continuous'); }}>
            Continuous (adjust balance)
          </Button>
        </div>

        {/* Balance slider */}
        <Card>
          <CardHeader><CardTitle className="text-base">Balance Offset: {balance > 0 ? '+' : ''}{balance}%</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">L</span>
              <Slider min={-50} max={50} step={1} value={[balance]} onValueChange={([v]) => setBalance(v)} className="flex-1" />
              <span className="text-sm font-medium">R</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Adjust until both channels sound equally loud. A non-zero offset indicates driver imbalance.
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button size="lg" onClick={isPlaying ? stop : start}>
            {isPlaying ? <><Square className="h-4 w-4 mr-2" /> Stop</> : <><Play className="h-4 w-4 mr-2" /> Play</>}
          </Button>
          <Button variant="outline" onClick={saveResult} disabled={!isPlaying}>
            Save & Next
          </Button>
          <Button variant="ghost" size="icon" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
        </div>

        {/* Results */}
        {Object.keys(results).length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Results</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {TEST_FREQS.map(tf => {
                  const offset = results[tf.freq];
                  if (offset === undefined) return null;
                  const pass = Math.abs(offset) <= 5;
                  return (
                    <div key={tf.freq} className="flex items-center justify-between text-sm">
                      <span>{tf.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{offset > 0 ? '+' : ''}{offset}%</span>
                        <Badge variant={pass ? 'default' : 'destructive'}>
                          {pass ? 'PASS' : 'IMBALANCED'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ToolPage>
  );
}
