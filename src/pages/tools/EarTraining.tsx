import { useState, useRef, useCallback, useEffect } from 'react';
import { getToolById } from '@/config/tool-registry';
import { ToolPage } from '@/components/shared/ToolPage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Square, RotateCcw } from 'lucide-react';
import { registerCallback, unregisterCallback, notifyPlayStart } from '@/lib/playback-manager';

const tool = getToolById('ear-training')!;

const ALL_BANDS = [
  { name: 'Sub', freq: 60, q: 1.5 },
  { name: 'Bass', freq: 150, q: 1.5 },
  { name: 'Low-Mid', freq: 400, q: 1.5 },
  { name: 'Mid', freq: 1000, q: 1.5 },
  { name: 'Upper-Mid', freq: 2500, q: 1.5 },
  { name: 'Presence', freq: 5000, q: 1.5 },
  { name: 'Brilliance', freq: 8000, q: 1.5 },
  { name: 'Air', freq: 12000, q: 1.5 },
];

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, { bandCount: number; boost: number; q: number }> = {
  easy: { bandCount: 3, boost: 12, q: 1.0 },
  medium: { bandCount: 5, boost: 9, q: 1.5 },
  hard: { bandCount: 8, boost: 6, q: 2.5 },
};

function getBands(diff: Difficulty) {
  const cfg = DIFFICULTY_CONFIG[diff];
  if (cfg.bandCount === 3) return [ALL_BANDS[1], ALL_BANDS[3], ALL_BANDS[5]];
  if (cfg.bandCount === 5) return [ALL_BANDS[0], ALL_BANDS[1], ALL_BANDS[3], ALL_BANDS[5], ALL_BANDS[7]];
  return ALL_BANDS;
}

export default function EarTraining() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [isPlaying, setIsPlaying] = useState(false);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [totalRounds] = useState(10);
  const [targetBand, setTargetBand] = useState<number | null>(null);
  const [guess, setGuess] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const noiseRef = useRef<AudioBufferSourceNode | null>(null);
  const eqRef = useRef<BiquadFilterNode | null>(null);

  const bands = getBands(difficulty);
  const cfg = DIFFICULTY_CONFIG[difficulty];

  const stop = useCallback(() => {
    noiseRef.current?.stop();
    ctxRef.current?.close();
    noiseRef.current = null;
    ctxRef.current = null;
    eqRef.current = null;
    setIsPlaying(false);
  }, []);

  const createPinkNoise = (ctx: AudioContext) => {
    const sr = ctx.sampleRate;
    const len = sr * 8;
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }
    return buf;
  };

  const startRound = useCallback(() => {
    stop();
    setGuess(null);
    setShowAnswer(false);

    const randomIdx = Math.floor(Math.random() * bands.length);
    setTargetBand(randomIdx);

    notifyPlayStart('ear-training');
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const noise = ctx.createBufferSource();
    noise.buffer = createPinkNoise(ctx);
    noise.loop = true;
    noiseRef.current = noise;

    const eq = ctx.createBiquadFilter();
    eq.type = 'peaking';
    eq.frequency.value = bands[randomIdx].freq;
    eq.Q.value = cfg.q;
    eq.gain.value = cfg.boost;
    eqRef.current = eq;

    const gain = ctx.createGain();
    gain.gain.value = 0.4;

    noise.connect(eq);
    eq.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    setIsPlaying(true);
  }, [bands, cfg, stop]);

  const handleGuess = (bandName: string) => {
    if (showAnswer || targetBand === null) return;
    setGuess(bandName);
    setShowAnswer(true);
    if (bandName === bands[targetBand].name) {
      setScore(s => s + 1);
    }
    stop();
  };

  const nextRound = () => {
    if (round + 1 >= totalRounds) return;
    setRound(r => r + 1);
    startRound();
  };

  const resetGame = () => {
    stop();
    setRound(0);
    setScore(0);
    setTargetBand(null);
    setGuess(null);
    setShowAnswer(false);
  };

  useEffect(() => {
    registerCallback('ear-training', stop);
    return () => { stop(); unregisterCallback('ear-training'); };
  }, [stop]);

  const gameOver = round + 1 >= totalRounds && showAnswer;

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        {/* Difficulty */}
        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as const).map(d => (
            <Button key={d} variant={difficulty === d ? 'default' : 'outline'} size="sm"
              onClick={() => { setDifficulty(d); resetGame(); }}>
              {d.charAt(0).toUpperCase() + d.slice(1)} ({DIFFICULTY_CONFIG[d].bandCount} bands, +{DIFFICULTY_CONFIG[d].boost}dB)
            </Button>
          ))}
        </div>

        {/* Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-heading font-bold">{score} / {round + (showAnswer ? 1 : 0)}</p>
                <p className="text-sm text-muted-foreground">Round {round + 1} of {totalRounds}</p>
              </div>
              <Progress value={((round + (showAnswer ? 1 : 0)) / totalRounds) * 100} className="w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Game area */}
        {targetBand === null ? (
          <Button size="lg" onClick={() => startRound()}>
            <Play className="h-4 w-4 mr-2" /> Start Game
          </Button>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {showAnswer ? 'Answer Revealed' : 'Which frequency band is boosted?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {bands.map(b => {
                  const isCorrect = showAnswer && targetBand !== null && b.name === bands[targetBand].name;
                  const isWrong = showAnswer && guess === b.name && !isCorrect;
                  return (
                    <Button key={b.name} size="sm"
                      variant={isCorrect ? 'default' : isWrong ? 'destructive' : 'outline'}
                      className={isCorrect ? 'ring-2 ring-primary' : ''}
                      disabled={showAnswer}
                      onClick={() => handleGuess(b.name)}>
                      {b.name} ({b.freq < 1000 ? b.freq + 'Hz' : (b.freq / 1000) + 'kHz'})
                    </Button>
                  );
                })}
              </div>

              {showAnswer && (
                <div className="flex items-center gap-3">
                  <Badge variant={guess === bands[targetBand].name ? 'default' : 'destructive'}>
                    {guess === bands[targetBand].name ? '✓ Correct!' : `✗ It was ${bands[targetBand].name}`}
                  </Badge>
                  {!gameOver ? (
                    <Button size="sm" onClick={nextRound}>Next Round</Button>
                  ) : (
                    <Button size="sm" onClick={resetGame}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Play Again
                    </Button>
                  )}
                </div>
              )}

              {isPlaying && (
                <Button variant="outline" size="sm" onClick={stop}>
                  <Square className="h-3 w-3 mr-1" /> Stop Sound
                </Button>
              )}

              {!isPlaying && !showAnswer && (
                <Button variant="outline" size="sm" onClick={startRound}>
                  <Play className="h-3 w-3 mr-1" /> Replay
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {gameOver && (
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <p className="text-3xl font-heading font-bold">{Math.round((score / totalRounds) * 100)}%</p>
              <p className="text-muted-foreground">
                {score >= 8 ? 'Excellent ears!' : score >= 6 ? 'Good job! Keep practicing.' : 'Keep at it — practice makes perfect.'}
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">
          🎧 Train your ears to identify frequency bands. Pink noise with a peaking EQ boost is played — guess which band. Works best with headphones.
        </p>
      </div>
    </ToolPage>
  );
}
