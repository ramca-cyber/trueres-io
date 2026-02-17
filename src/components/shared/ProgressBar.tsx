interface ProgressBarProps {
  value: number; // 0-100, or -1 for indeterminate
  label?: string;
  sublabel?: string;
}

export function ProgressBar({ value, label, sublabel }: ProgressBarProps) {
  const isIndeterminate = value < 0;

  return (
    <div className="space-y-1.5">
      {(label || sublabel) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium">{label}</span>}
          {sublabel && <span className="text-muted-foreground text-xs">{sublabel}</span>}
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        {isIndeterminate ? (
          <div className="h-full w-1/3 rounded-full bg-primary animate-[indeterminate_1.5s_ease-in-out_infinite]" />
        ) : (
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        )}
      </div>
    </div>
  );
}
