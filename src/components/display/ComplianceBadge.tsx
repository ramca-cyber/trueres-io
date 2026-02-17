import { PLATFORM_TARGETS } from '@/config/constants';

interface ComplianceBadgeProps {
  integratedLufs: number;
  truePeakDb: number;
}

export function ComplianceBadge({ integratedLufs, truePeakDb }: ComplianceBadgeProps) {
  const platforms = Object.entries(PLATFORM_TARGETS).map(([name, target]) => {
    const lufsOk = integratedLufs <= target.lufs + 1 && integratedLufs >= target.lufs - 3;
    const peakOk = truePeakDb <= target.truePeak;
    const pass = lufsOk && peakOk;

    return { name, target, lufsOk, peakOk, pass };
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {platforms.map((p) => (
        <div
          key={p.name}
          className={`rounded-md border px-3 py-2 text-xs ${
            p.pass
              ? 'border-status-pass/30 bg-status-pass/5 text-status-pass'
              : 'border-status-fail/30 bg-status-fail/5 text-status-fail'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium capitalize">{p.name}</span>
            <span>{p.pass ? '✓' : '✗'}</span>
          </div>
          <div className="text-[10px] opacity-70 mt-0.5">
            Target: {p.target.lufs} LUFS / {p.target.truePeak} dBTP
          </div>
        </div>
      ))}
    </div>
  );
}
