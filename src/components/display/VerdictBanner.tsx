import { type VerdictResult } from '@/types/analysis';
import { ShieldCheck, ShieldX, ShieldAlert } from 'lucide-react';

interface VerdictBannerProps {
  verdict: VerdictResult;
}

export function VerdictBanner({ verdict }: VerdictBannerProps) {
  const { score, grade, isGenuineHiRes, issues, positives } = verdict;

  const gradeColors: Record<string, string> = {
    A: 'text-status-pass border-status-pass/30 bg-status-pass/10',
    B: 'text-status-pass border-status-pass/20 bg-status-pass/5',
    C: 'text-status-warn border-status-warn/30 bg-status-warn/10',
    D: 'text-status-fail border-status-fail/20 bg-status-fail/5',
    F: 'text-status-fail border-status-fail/30 bg-status-fail/10',
  };

  const Icon = isGenuineHiRes ? ShieldCheck : score >= 60 ? ShieldAlert : ShieldX;

  return (
    <div className={`rounded-lg border p-6 ${gradeColors[grade]}`}>
      <div className="flex items-center gap-4">
        {/* Score circle */}
        <div className="relative flex items-center justify-center">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" opacity={0.15} />
            <circle
              cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6"
              strokeDasharray={`${score * 2.51} 251`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-heading font-bold">{score}</span>
            <span className="text-[10px] font-medium opacity-70">/ 100</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <h3 className="font-heading font-bold text-lg">
              {isGenuineHiRes ? 'Genuine Hi-Res Audio' : score >= 60 ? 'Potential Issues Detected' : 'Not Genuine Hi-Res'}
            </h3>
            <span className="text-2xl font-heading font-bold">{grade}</span>
          </div>

          {positives.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {positives.map((p, i) => (
                <li key={i} className="text-xs flex items-center gap-1.5">
                  <span className="text-status-pass">✓</span> {p}
                </li>
              ))}
            </ul>
          )}

          {issues.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {issues.map((issue, i) => (
                <li key={i} className="text-xs flex items-center gap-1.5">
                  <span className="text-status-fail">✗</span> {issue}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
