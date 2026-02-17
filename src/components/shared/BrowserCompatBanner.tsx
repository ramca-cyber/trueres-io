import { useState, useEffect } from 'react';
import { AlertTriangle, X, Info } from 'lucide-react';
import { detectCapabilities, getCompatWarnings, type CompatWarning } from '@/config/browser-compat';

export function BrowserCompatBanner() {
  const [warnings, setWarnings] = useState<CompatWarning[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const caps = detectCapabilities();
    const w = getCompatWarnings(caps).filter((w) => w.severity !== 'info');
    setWarnings(w);
  }, []);

  if (dismissed || warnings.length === 0) return null;

  const hasCritical = warnings.some((w) => w.severity === 'critical');

  return (
    <div
      className={`relative px-4 py-3 text-sm ${
        hasCritical
          ? 'bg-destructive/10 border-b border-destructive/30 text-destructive'
          : 'bg-status-warn/10 border-b border-status-warn/30 text-status-warn'
      }`}
    >
      <div className="container flex items-start gap-3">
        {hasCritical ? (
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        ) : (
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
        )}
        <div className="flex-1">
          <p className="font-medium">
            {hasCritical ? 'Browser Compatibility Issue' : 'Limited Browser Support'}
          </p>
          <ul className="mt-1 space-y-0.5 text-xs opacity-90">
            {warnings.map((w, i) => (
              <li key={i}>• {w.message}</li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
