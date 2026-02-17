import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Square, Bell } from 'lucide-react';

const tool = getToolById('listening-monitor')!;

// Safe listening durations per NIOSH (85 dB = 8h, 3dB exchange rate)
function safeDurationMinutes(splDb: number): number {
  if (splDb <= 70) return Infinity;
  return (8 * 60) / Math.pow(2, (splDb - 85) / 3);
}

function formatDuration(minutes: number): string {
  if (!isFinite(minutes)) return 'Unlimited';
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

const ListeningMonitor = () => {
  const [spl, setSpl] = useState([85]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [breakReminder, setBreakReminder] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeMins = safeDurationMinutes(spl[0]);
  const safeSeconds = safeMins * 60;
  const progress = isFinite(safeSeconds) ? Math.min(100, (elapsed / safeSeconds) * 100) : 0;
  const isOverLimit = isFinite(safeSeconds) && elapsed >= safeSeconds;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
    };
  }, []);

  const start = useCallback(() => {
    setRunning(true);
    setElapsed(0);
    setBreakReminder(false);
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    // Break reminder every 30 minutes
    breakTimerRef.current = setTimeout(() => setBreakReminder(true), 30 * 60 * 1000);
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setElapsed(0);
    setBreakReminder(false);
  }, [stop]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const splLevels = [
    { spl: 70, label: 'Quiet office', safe: 'Unlimited' },
    { spl: 75, label: 'Background music', safe: formatDuration(safeDurationMinutes(75)) },
    { spl: 80, label: 'Alarm clock', safe: formatDuration(safeDurationMinutes(80)) },
    { spl: 85, label: 'Heavy traffic', safe: formatDuration(safeDurationMinutes(85)) },
    { spl: 90, label: 'Hair dryer', safe: formatDuration(safeDurationMinutes(90)) },
    { spl: 95, label: 'Motorcycle', safe: formatDuration(safeDurationMinutes(95)) },
    { spl: 100, label: 'Concert', safe: formatDuration(safeDurationMinutes(100)) },
    { spl: 105, label: 'Max headphone vol', safe: formatDuration(safeDurationMinutes(105)) },
    { spl: 110, label: 'Rock concert front', safe: formatDuration(safeDurationMinutes(110)) },
  ];

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        {isOverLimit && (
          <Alert variant="destructive">
            <Bell className="h-4 w-4" />
            <AlertDescription>
              You've exceeded the recommended safe listening time at {spl[0]} dB SPL. Take a break!
            </AlertDescription>
          </Alert>
        )}

        {breakReminder && !isOverLimit && (
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertDescription>30-minute reminder: Consider taking a short break to rest your ears.</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Estimated listening level</p>
            <p className="text-5xl font-heading font-bold text-primary">{spl[0]} <span className="text-lg">dB SPL</span></p>
            <p className="text-sm text-muted-foreground">
              Safe duration: <span className={`font-medium ${isFinite(safeMins) && safeMins < 60 ? 'text-status-warn' : 'text-status-pass'}`}>{formatDuration(safeMins)}</span>
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <Label className="text-xs">Set your estimated listening level</Label>
            <Slider min={60} max={115} step={1} value={spl} onValueChange={setSpl} className="mt-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>60 dB</span><span>85 dB</span><span>115 dB</span>
            </div>
          </div>

          {/* Timer */}
          <div className="text-center space-y-3">
            <p className="text-3xl font-heading font-bold tabular-nums">{formatTime(elapsed)}</p>
            {isFinite(safeSeconds) && (
              <div className="w-full max-w-xs mx-auto bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${isOverLimit ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            <div className="flex gap-2 justify-center">
              {!running ? (
                <Button onClick={start} className="gap-2"><Play className="h-4 w-4" /> Start</Button>
              ) : (
                <Button onClick={stop} variant="destructive" className="gap-2"><Square className="h-4 w-4" /> Pause</Button>
              )}
              <Button onClick={reset} variant="outline">Reset</Button>
            </div>
          </div>
        </div>

        {/* Reference Table */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-heading font-semibold">Safe Listening Reference (NIOSH)</h2>
          <div className="grid gap-1">
            {splLevels.map((l) => (
              <div key={l.spl} className={`flex justify-between items-center text-xs px-2 py-1.5 rounded ${spl[0] === l.spl ? 'bg-primary/10 border border-primary/30' : 'bg-secondary'}`}>
                <span><span className="font-medium">{l.spl} dB</span> — {l.label}</span>
                <span className="font-medium">{l.safe}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          This tool provides estimates only. Actual SPL depends on your equipment and volume settings. Use a calibrated SPL meter for accurate measurements.
        </p>
      </div>
    </ToolPage>
  );
};

export default ListeningMonitor;
