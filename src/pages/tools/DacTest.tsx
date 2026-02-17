import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Button } from '@/components/ui/button';
import { Play, Square, CheckCircle } from 'lucide-react';

const tool = getToolById('dac-test')!;

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const DacTest = () => {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | OscillatorNode | null>(null);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); } catch { }
      audioCtxRef.current?.close();
    };
  }, []);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const stop = useCallback(() => {
    try { sourceRef.current?.stop(); } catch { }
    sourceRef.current = null;
    setRunning(null);
  }, []);

  const runChannelTest = useCallback(() => {
    stop();
    setRunning('channel');
    const ctx = getCtx();
    const duration = 2;
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(2, sr * duration * 2, sr);
    const left = buf.getChannelData(0);
    const right = buf.getChannelData(1);

    for (let i = 0; i < sr * duration; i++) {
      left[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / sr);
    }
    for (let i = sr * duration; i < sr * duration * 2; i++) {
      right[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / sr);
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);
    source.onended = () => {
      setRunning(null);
      setResults((prev) => [...prev, { name: 'Channel Test', passed: true, detail: 'Left then right tone played. Verify you heard each side separately.' }]);
    };
    source.start();
    sourceRef.current = source;
  }, [getCtx, stop]);

  const runPolarityTest = useCallback(() => {
    stop();
    setRunning('polarity');
    const ctx = getCtx();
    const duration = 1;
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(2, sr * duration, sr);
    const left = buf.getChannelData(0);
    const right = buf.getChannelData(1);

    for (let i = 0; i < sr * duration; i++) {
      const val = 0.5 * Math.sin(2 * Math.PI * 200 * i / sr);
      left[i] = val;
      right[i] = val;
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);
    source.onended = () => {
      setRunning(null);
      setResults((prev) => [...prev, { name: 'Polarity Test', passed: true, detail: 'In-phase 200Hz tone played. Sound should appear centered between speakers.' }]);
    };
    source.start();
    sourceRef.current = source;
  }, [getCtx, stop]);

  const runDitherTest = useCallback(() => {
    stop();
    setRunning('dither');
    const ctx = getCtx();
    const duration = 3;
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * duration, sr);
    const data = buf.getChannelData(0);

    const amp = Math.pow(10, -80 / 20);
    for (let i = 0; i < sr * duration; i++) {
      data[i] = amp * Math.sin(2 * Math.PI * 1000 * i / sr);
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);
    source.onended = () => {
      setRunning(null);
      setResults((prev) => [...prev, { name: 'Low-Level Signal Test', passed: true, detail: 'Very quiet 1kHz tone at -80dBFS. If you can hear it, your DAC has good resolution.' }]);
    };
    source.start();
    sourceRef.current = source;
  }, [getCtx, stop]);

  const runDynamicRangeTest = useCallback(() => {
    stop();
    setRunning('dynamic');
    const ctx = getCtx();
    const duration = 4;
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * duration, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < sr * duration; i++) {
      const t = i / (sr * duration);
      const db = -60 + t * 60;
      const amp = Math.pow(10, db / 20);
      data[i] = amp * Math.sin(2 * Math.PI * 1000 * i / sr);
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);
    source.onended = () => {
      setRunning(null);
      setResults((prev) => [...prev, { name: 'Dynamic Range Test', passed: true, detail: '1kHz tone fading from -60dBFS to 0dBFS. Should be smooth with no audible steps.' }]);
    };
    source.start();
    sourceRef.current = source;
  }, [getCtx, stop]);

  const tests = [
    { id: 'channel', name: 'Channel Test', desc: 'Verify left and right channels', run: runChannelTest },
    { id: 'polarity', name: 'Polarity Test', desc: 'Check phase alignment', run: runPolarityTest },
    { id: 'dither', name: 'Low-Level Signal', desc: 'Test DAC resolution at -80dBFS', run: runDitherTest },
    { id: 'dynamic', name: 'Dynamic Range', desc: 'Smooth fade from silence to full', run: runDynamicRangeTest },
  ];

  return (
    <ToolPage tool={tool}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tests.map((test) => (
            <div key={test.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{test.name}</p>
                <p className="text-xs text-muted-foreground">{test.desc}</p>
              </div>
              <Button
                size="sm"
                variant={running === test.id ? 'destructive' : 'outline'}
                onClick={running === test.id ? stop : test.run}
                disabled={running !== null && running !== test.id}
              >
                {running === test.id ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-heading font-semibold">Results</h3>
            {results.map((r, i) => (
              <div key={i} className="rounded-md bg-card/50 border border-border p-3 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-status-pass shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolPage>
  );
};
export default DacTest;
