import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Button } from '@/components/ui/button';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { Play, Square, Shuffle } from 'lucide-react';
import { registerCallback, unregisterCallback, notifyPlayStart } from '@/lib/playback-manager';

const tool = getToolById('abx-test')!;

function binomialP(correct: number, total: number): number {
  // P(X >= correct) under H0: p=0.5
  let p = 0;
  for (let k = correct; k <= total; k++) {
    let binom = 1;
    for (let i = 0; i < k; i++) binom *= (total - i) / (i + 1);
    p += binom * Math.pow(0.5, total);
  }
  return p;
}

const ABXTest = () => {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [bufferA, setBufferA] = useState<AudioBuffer | null>(null);
  const [bufferB, setBufferB] = useState<AudioBuffer | null>(null);
  const [xIsA, setXIsA] = useState(true);
  const [trials, setTrials] = useState<{ guess: 'A' | 'B'; correct: boolean }[]>([]);
  const [testStarted, setTestStarted] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    registerCallback('abx-test', stopPlayback);
    return () => {
      try { sourceRef.current?.stop(); } catch {}
      audioCtxRef.current?.close();
      unregisterCallback('abx-test');
    };
  }, []);

  const decodeFile = useCallback(async (file: File): Promise<AudioBuffer> => {
    const ctx = new AudioContext();
    const arrayBuf = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    ctx.close();
    return decoded;
  }, []);

  const handleFileA = useCallback(async (file: File) => {
    setFileA(file);
    const buf = await decodeFile(file);
    setBufferA(buf);
  }, [decodeFile]);

  const handleFileB = useCallback(async (file: File) => {
    setFileB(file);
    const buf = await decodeFile(file);
    setBufferB(buf);
  }, [decodeFile]);

  const stopPlayback = useCallback(() => {
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    setCurrentlyPlaying(null);
  }, []);

  const playBuffer = useCallback((buffer: AudioBuffer, label: string) => {
    notifyPlayStart('abx-test');
    stopPlayback();
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => setCurrentlyPlaying(null);
    source.start();
    sourceRef.current = source;
    setCurrentlyPlaying(label);
  }, [stopPlayback]);

  const startTest = useCallback(() => {
    setTrials([]);
    setTestStarted(true);
    setXIsA(Math.random() < 0.5);
  }, []);

  const newTrial = useCallback(() => {
    setXIsA(Math.random() < 0.5);
    stopPlayback();
  }, [stopPlayback]);

  const submitGuess = useCallback((guess: 'A' | 'B') => {
    const correct = (guess === 'A' && xIsA) || (guess === 'B' && !xIsA);
    setTrials(prev => [...prev, { guess, correct }]);
    newTrial();
  }, [xIsA, newTrial]);

  const correctCount = trials.filter(t => t.correct).length;
  const totalTrials = trials.length;
  const pValue = totalTrials > 0 ? binomialP(correctCount, totalTrials) : 1;

  const canStart = bufferA && bufferB;

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        {/* File Loading */}
        {!testStarted && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Sample A</h3>
              <FileDropZone
                onFileSelect={handleFileA}
                accept="audio/*"
                label={fileA ? `✓ ${fileA.name}` : 'Drop audio file A'}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Sample B</h3>
              <FileDropZone
                onFileSelect={handleFileB}
                accept="audio/*"
                label={fileB ? `✓ ${fileB.name}` : 'Drop audio file B'}
              />
            </div>
          </div>
        )}

        {canStart && !testStarted && (
          <div className="text-center">
            <Button onClick={startTest} className="gap-2">
              <Shuffle className="h-4 w-4" /> Start ABX Test
            </Button>
          </div>
        )}

        {/* Active Test */}
        {testStarted && bufferA && bufferB && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Trial {totalTrials + 1} — Listen to A, B, and X, then guess whether X is A or B.
            </p>

            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant={currentlyPlaying === 'A' ? 'default' : 'outline'}
                onClick={() => currentlyPlaying === 'A' ? stopPlayback() : playBuffer(bufferA, 'A')}
                className="gap-2 min-w-[5rem]"
              >
                {currentlyPlaying === 'A' ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />} A
              </Button>
              <Button
                variant={currentlyPlaying === 'B' ? 'default' : 'outline'}
                onClick={() => currentlyPlaying === 'B' ? stopPlayback() : playBuffer(bufferB, 'B')}
                className="gap-2 min-w-[5rem]"
              >
                {currentlyPlaying === 'B' ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />} B
              </Button>
              <Button
                variant={currentlyPlaying === 'X' ? 'secondary' : 'outline'}
                onClick={() => currentlyPlaying === 'X' ? stopPlayback() : playBuffer(xIsA ? bufferA : bufferB, 'X')}
                className="gap-2 min-w-[5rem] border-primary/50"
              >
                {currentlyPlaying === 'X' ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />} X
              </Button>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <p className="text-xs text-muted-foreground self-center mr-2">X is:</p>
              <Button size="sm" onClick={() => submitGuess('A')}>A</Button>
              <Button size="sm" onClick={() => submitGuess('B')}>B</Button>
            </div>
          </div>
        )}

        {/* Results */}
        {totalTrials > 0 && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-heading font-semibold">Results</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-heading font-bold">{correctCount}/{totalTrials}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{totalTrials > 0 ? Math.round((correctCount / totalTrials) * 100) : 0}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div>
                <p className={`text-2xl font-heading font-bold ${pValue < 0.05 ? 'text-status-pass' : 'text-muted-foreground'}`}>
                  p={pValue.toFixed(3)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pValue < 0.05 ? 'Significant!' : 'Not significant'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {trials.map((t, i) => (
                <span
                  key={i}
                  className={`inline-block w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${
                    t.correct ? 'bg-status-pass/20 text-status-pass' : 'bg-destructive/20 text-destructive'
                  }`}
                >
                  {t.correct ? '✓' : '✗'}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setTestStarted(false); setTrials([]); }}>
                New Test
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
};

export default ABXTest;
