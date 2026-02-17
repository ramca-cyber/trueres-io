import { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  status?: 'pass' | 'warn' | 'fail' | 'info' | 'neutral';
  icon?: ReactNode;
}

export function MetricCard({ label, value, subtext, status = 'neutral', icon }: MetricCardProps) {
  const statusColors = {
    pass: 'border-status-pass/30 bg-status-pass/5',
    warn: 'border-status-warn/30 bg-status-warn/5',
    fail: 'border-status-fail/30 bg-status-fail/5',
    info: 'border-status-info/30 bg-status-info/5',
    neutral: 'border-border bg-card',
  };

  const valueColors = {
    pass: 'text-status-pass',
    warn: 'text-status-warn',
    fail: 'text-status-fail',
    info: 'text-status-info',
    neutral: 'text-foreground',
  };

  return (
    <div className={`rounded-lg border p-4 ${statusColors[status]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-heading font-bold mt-1 ${valueColors[status]}`}>
            {value}
          </p>
          {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </div>
  );
}
