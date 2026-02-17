interface DRGaugeProps {
  drScore: number;
}

const GENRE_ZONES = [
  { min: 0, max: 4, label: 'Loudness War', color: 'hsl(0, 70%, 50%)' },
  { min: 4, max: 7, label: 'Modern Pop/Rock', color: 'hsl(30, 70%, 50%)' },
  { min: 7, max: 10, label: 'Well-Mastered', color: 'hsl(50, 70%, 50%)' },
  { min: 10, max: 14, label: 'Hi-Fi / Acoustic', color: 'hsl(90, 60%, 45%)' },
  { min: 14, max: 20, label: 'Classical / Jazz', color: 'hsl(150, 60%, 40%)' },
];

function getGenreContext(dr: number): string {
  if (dr <= 4) return 'Comparable to: heavily compressed modern pop';
  if (dr <= 7) return 'Comparable to: typical rock/EDM master';
  if (dr <= 10) return 'Comparable to: well-mastered album';
  if (dr <= 14) return 'Comparable to: acoustic / audiophile recording';
  return 'Comparable to: classical or live recording';
}

export function DRGauge({ drScore }: DRGaugeProps) {
  const clampedDR = Math.max(0, Math.min(20, drScore));
  const pct = (clampedDR / 20) * 100;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-heading font-semibold">Dynamic Range Scale</h3>
      <div className="relative h-6 rounded-full overflow-hidden border border-border">
        {GENRE_ZONES.map((zone) => (
          <div
            key={zone.label}
            className="absolute top-0 h-full"
            style={{
              left: `${(zone.min / 20) * 100}%`,
              width: `${((zone.max - zone.min) / 20) * 100}%`,
              backgroundColor: zone.color,
              opacity: 0.35,
            }}
          />
        ))}
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground z-10"
          style={{ left: `${pct}%` }}
        />
        <div
          className="absolute -top-0.5 h-7 w-3 rounded-sm border-2 border-foreground bg-background z-10"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
        {GENRE_ZONES.map((zone) => (
          <span key={zone.label} className="text-center" style={{ width: `${((zone.max - zone.min) / 20) * 100}%` }}>
            {zone.label}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground italic">{getGenreContext(drScore)}</p>
    </div>
  );
}
