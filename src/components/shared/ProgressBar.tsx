interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  sublabel?: string;
}

export function ProgressBar({ value, label, sublabel }: ProgressBarProps) {
  return (
    <div className="space-y-1.5">
      {(label || sublabel) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium">{label}</span>}
          {sublabel && <span className="text-muted-foreground text-xs">{sublabel}</span>}
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
