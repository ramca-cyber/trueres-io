import { useState, useRef, useCallback, useEffect } from 'react';
import { getToolById } from '@/config/tool-registry';
import { ToolPage } from '@/components/shared/ToolPage';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Square } from 'lucide-react';

const tool = getToolById('soundstage-test')!;

type TestType = 'panning' | 'center' | 'width' | 'hrtf';

const HRTF_POSITIONS = [
  { label: 'Front', az: 0, el: 0 },
  { label: 'Front-Left', az: -45, el: 0 },
  { label: 'Left', az: -90, el: 0 },
  { label: 'Rear-Left', az: -135, el: 0 },
  { label: 'Rear', az: 180, el: 0 },
  { label: 'Rear-Right', az: 135, el: 0 },
  { label: 'Right', az: 90, el: 0 },
  { label: 'Front-Right', az: 45, el: 0 },
  { label: 'Above', az: 0, el: 90 },
];

export default function SoundstageTest() {
  const [testType, setTestType] = useState<TestType>('panning');
  const [isPlaying, setIsPlaying] = useState(false);
  const [panPosition, setPanPosition] = useState(0);
  const [hrtfIdx, setHrtfIdx] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const noiseRef = useRef<AudioBufferSourceNode | null>(null);
  const panRef = useRef<StereoPannerNode | null>(null);
  const pannerRef = useRef<PannerNode | null>(null);
  const animRef = useRef<number>(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    oscRef.current?.stop();
    noiseRef.current?.stop();
    ctxRef.current?.close();
    oscRef.current = null;
    noiseRef.current = null;
    ctxRef.current = null;
    panRef.current = null;
    pannerRef.current = null;
    setIsPlaying(false);
  }, []);

  const createPinkNoise = (ctx: AudioContext, duration: number) => {
    const sr = ctx.sampleRate;
    const len = sr * duration;
    const buf = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
        b6 = white * 0.115926;
      }
    }
    return buf;
  };

  const start = useCallback(() => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    gain.connect(ctx.destination);

    if (testType === 'panning') {
      const osc = ctx.createOscillator();
      osc.frequency.value = 440;
      oscRef.current = osc;
      const pan = ctx.createStereoPanner();
      panRef.current = pan;
      osc.connect(pan);
      pan.connect(gain);
      osc.start();

      // Sweep L->R->L
      let pos = -1;
      let dir = 0.015;
      const animate = () => {
        pos += dir;
        if (pos >= 1) dir = -0.015;
        if (pos <= -1) dir = 0.015;
        pan.pan.value = pos;
        setPanPosition(pos);
        animRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else if (testType === 'center') {
      const osc = ctx.createOscillator();
      osc.frequency.value = 1000;
      oscRef.current = osc;
      osc.connect(gain);
      osc.start();
    } else if (testType === 'width') {
      const noise = ctx.createBufferSource();
      noise.buffer = createPinkNoise(ctx, 30);
      noise.loop = true;
      noiseRef.current = noise;
      noise.connect(gain);
      noise.start();
    } else if (testType === 'hrtf') {
      const osc = ctx.createOscillator();
      osc.frequency.value = 440;
      oscRef.current = osc;
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      pannerRef.current = panner;
      const pos = HRTF_POSITIONS[hrtfIdx];
      const rad = (pos.az * Math.PI) / 180;
      const elRad = (pos.el * Math.PI) / 180;
      panner.positionX.value = Math.sin(rad) * Math.cos(elRad);
      panner.positionY.value = Math.sin(elRad);
      panner.positionZ.value = -Math.cos(rad) * Math.cos(elRad);
      osc.connect(panner);
      panner.connect(gain);
      osc.start();
    }

    setIsPlaying(true);
  }, [testType, hrtfIdx]);

  // Update HRTF position live
  useEffect(() => {
    if (pannerRef.current && isPlaying) {
      const pos = HRTF_POSITIONS[hrtfIdx];
      const rad = (pos.az * Math.PI) / 180;
      const elRad = (pos.el * Math.PI) / 180;
      pannerRef.current.positionX.value = Math.sin(rad) * Math.cos(elRad);
      pannerRef.current.positionY.value = Math.sin(elRad);
      pannerRef.current.positionZ.value = -Math.cos(rad) * Math.cos(elRad);
    }
  }, [hrtfIdx, isPlaying]);

  useEffect(() => () => { stop(); }, [stop]);

  const switchTest = (t: TestType) => {
    stop();
    setTestType(t);
  };

  // Visual circle for HRTF
  const hrtfPos = HRTF_POSITIONS[hrtfIdx];
  const dotX = 50 + Math.sin((hrtfPos.az * Math.PI) / 180) * 35;
  const dotY = 50 - Math.cos((hrtfPos.az * Math.PI) / 180) * 35;

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        {/* Test selector */}
        <div className="flex flex-wrap gap-2">
          {([['panning', 'Panning Sweep'], ['center', 'Center Image'], ['width', 'Width Test'], ['hrtf', 'HRTF 3D']] as const).map(([key, label]) => (
            <Button key={key} variant={testType === key ? 'default' : 'outline'} size="sm"
              onClick={() => switchTest(key)}>
              {label}
            </Button>
          ))}
        </div>

        {/* Visual */}
        <Card>
          <CardContent className="pt-6">
            {testType === 'panning' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>L</span><span>C</span><span>R</span>
                </div>
                <div className="relative h-4 bg-secondary rounded-full">
                  <div className="absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-primary border-2 border-primary-foreground shadow transition-all"
                    style={{ left: `calc(${((panPosition + 1) / 2) * 100}% - 12px)` }} />
                </div>
                <p className="text-sm text-muted-foreground text-center">Tone sweeps left → right → left. Listen for smooth movement.</p>
              </div>
            )}
            {testType === 'center' && (
              <div className="text-center space-y-2">
                <div className="text-5xl font-bold text-primary">●</div>
                <p className="text-sm text-muted-foreground">A mono 1 kHz tone. Should appear perfectly centered between ears.</p>
              </div>
            )}
            {testType === 'width' && (
              <div className="text-center space-y-2">
                <p className="font-medium">Decorrelated Pink Noise</p>
                <p className="text-sm text-muted-foreground">Stereo pink noise. Notice the perceived width and spaciousness around your head.</p>
              </div>
            )}
            {testType === 'hrtf' && (
              <div className="space-y-4">
                <div className="relative w-48 h-48 mx-auto">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
                    <circle cx="50" cy="50" r="20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2 2" />
                    <line x1="50" y1="10" x2="50" y2="90" stroke="hsl(var(--border))" strokeWidth="0.5" />
                    <line x1="10" y1="50" x2="90" y2="50" stroke="hsl(var(--border))" strokeWidth="0.5" />
                    {/* Listener */}
                    <circle cx="50" cy="50" r="3" fill="hsl(var(--muted-foreground))" />
                    {/* Source */}
                    <circle cx={dotX} cy={dotY} r="5" fill="hsl(var(--primary))" />
                    {/* Labels */}
                    <text x="50" y="7" textAnchor="middle" fontSize="5" fill="hsl(var(--muted-foreground))">Front</text>
                    <text x="50" y="97" textAnchor="middle" fontSize="5" fill="hsl(var(--muted-foreground))">Rear</text>
                    <text x="5" y="52" textAnchor="start" fontSize="5" fill="hsl(var(--muted-foreground))">L</text>
                    <text x="95" y="52" textAnchor="end" fontSize="5" fill="hsl(var(--muted-foreground))">R</text>
                  </svg>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {HRTF_POSITIONS.map((p, i) => (
                    <Button key={i} size="sm" variant={hrtfIdx === i ? 'default' : 'outline'}
                      onClick={() => setHrtfIdx(i)}>
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Play/Stop */}
        <Button size="lg" onClick={isPlaying ? stop : start}>
          {isPlaying ? <><Square className="h-4 w-4 mr-2" /> Stop</> : <><Play className="h-4 w-4 mr-2" /> Play</>}
        </Button>

        <p className="text-xs text-muted-foreground">
          🎧 Use stereo headphones for all soundstage tests. The HRTF test uses your browser's built-in head-related transfer function for 3D positioning.
        </p>
      </div>
    </ToolPage>
  );
}
