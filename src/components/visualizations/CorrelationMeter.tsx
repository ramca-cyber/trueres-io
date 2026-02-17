interface CorrelationMeterProps {
  correlation: number;
  stereoWidth: number;
  midEnergy: number;
  sideEnergy: number;
}

export function CorrelationMeter({ correlation, stereoWidth, midEnergy, sideEnergy }: CorrelationMeterProps) {
  const clampedCorr = Math.max(-1, Math.min(1, correlation));
  const pct = ((clampedCorr + 1) / 2) * 100;

  const leftEnergy = midEnergy + sideEnergy > 0 ? (midEnergy / (midEnergy + sideEnergy)) * 100 : 50;

  const getRecommendation = () => {
    if (correlation < -0.2) return 'Warning: Significant phase cancellation detected. Mono playback will cause major signal loss.';
    if (correlation < 0.2) return 'Caution: Wide stereo image with limited mono compatibility. Check on mono speakers.';
    if (correlation < 0.5) return 'Moderate stereo width. Acceptable for most playback systems.';
    if (stereoWidth < 0.05) return 'Signal is essentially mono. Consider adding subtle stereo width if desired.';
    return 'Good mono compatibility with healthy stereo image.';
  };

  return (
    <div className="space-y-3">
      {/* Correlation meter */}
      <div className="space-y-1">
        <h3 className="text-sm font-heading font-semibold">Phase Correlation</h3>
        <div className="relative h-5 rounded-full overflow-hidden border border-border bg-muted/20">
          {/* Gradient background */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, hsl(0, 70%, 45%), hsl(40, 70%, 50%) 50%, hsl(140, 60%, 40%))',
            opacity: 0.3,
          }} />
          {/* Needle */}
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground z-10"
            style={{ left: `${pct}%` }}
          />
          <div
            className="absolute -top-0.5 h-6 w-3 rounded-sm border-2 border-foreground bg-background z-10"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>-1 (Out of phase)</span>
          <span>0</span>
          <span>+1 (Mono)</span>
        </div>
      </div>

      {/* L/R Balance */}
      <div className="space-y-1">
        <h3 className="text-sm font-heading font-semibold">Mid/Side Balance</h3>
        <div className="relative h-4 rounded-full overflow-hidden border border-border bg-muted/20">
          <div
            className="absolute top-0 h-full rounded-l-full"
            style={{
              width: `${midEnergy * 100}%`,
              backgroundColor: 'hsl(210, 60%, 50%)',
              opacity: 0.5,
            }}
          />
          <div
            className="absolute top-0 h-full rounded-r-full right-0"
            style={{
              width: `${sideEnergy * 100}%`,
              backgroundColor: 'hsl(40, 80%, 50%)',
              opacity: 0.5,
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Mid {(midEnergy * 100).toFixed(0)}%</span>
          <span>Side {(sideEnergy * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-lg border border-border bg-muted/10 p-3">
        <p className="text-xs text-muted-foreground">{getRecommendation()}</p>
      </div>
    </div>
  );
}
