import { useState, useMemo } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const tool = getToolById('db-converter')!;

type Unit = 'dBFS' | 'dBu' | 'dBV' | 'dBSPL' | 'vrms' | 'watts';

const UNITS: { id: Unit; label: string; desc: string }[] = [
  { id: 'dBFS', label: 'dBFS', desc: 'Digital full scale' },
  { id: 'dBu', label: 'dBu', desc: 'ref 0.775V' },
  { id: 'dBV', label: 'dBV', desc: 'ref 1V' },
  { id: 'dBSPL', label: 'dB SPL', desc: 'ref 20µPa' },
  { id: 'vrms', label: 'Volts RMS', desc: 'Voltage' },
  { id: 'watts', label: 'Watts', desc: 'Power' },
];

// Conversion helpers
function dBuToVrms(dBu: number): number { return 0.775 * Math.pow(10, dBu / 20); }
function vrmsTodBu(v: number): number { return 20 * Math.log10(v / 0.775); }
function dBVToVrms(dBV: number): number { return Math.pow(10, dBV / 20); }
function vrmsTodBV(v: number): number { return 20 * Math.log10(v); }

const REFERENCES = [
  { label: 'Professional line level', value: '+4 dBu = 1.228 Vrms' },
  { label: 'Consumer line level', value: '-10 dBV = 0.316 Vrms' },
  { label: 'Digital full scale (0 dBFS)', value: 'Maximum digital level' },
  { label: 'Threshold of hearing', value: '0 dB SPL = 20 µPa' },
  { label: 'Normal conversation', value: '~60 dB SPL' },
  { label: 'Threshold of pain', value: '~130 dB SPL' },
];

const DbConverter = () => {
  const [fromUnit, setFromUnit] = useState<Unit>('dBu');
  const [toUnit, setToUnit] = useState<Unit>('dBV');
  const [inputVal, setInputVal] = useState('4');
  const [impedance, setImpedance] = useState('600');

  const result = useMemo(() => {
    const val = parseFloat(inputVal);
    const z = parseFloat(impedance) || 600;
    if (isNaN(val)) return '—';

    // Convert input to Vrms as intermediate
    let vrms: number;
    switch (fromUnit) {
      case 'dBu': vrms = dBuToVrms(val); break;
      case 'dBV': vrms = dBVToVrms(val); break;
      case 'dBFS': vrms = dBVToVrms(val); break; // Approximate: dBFS ≈ dBV for digital
      case 'vrms': vrms = val; break;
      case 'watts': vrms = Math.sqrt(val * z); break;
      case 'dBSPL': return `${val} dB SPL`; // SPL doesn't convert to voltage directly
      default: return '—';
    }

    // Convert Vrms to target
    switch (toUnit) {
      case 'dBu': return `${vrmsTodBu(vrms).toFixed(2)} dBu`;
      case 'dBV': return `${vrmsTodBV(vrms).toFixed(2)} dBV`;
      case 'dBFS': return `${vrmsTodBV(vrms).toFixed(2)} dBFS`;
      case 'vrms': return `${vrms.toFixed(4)} Vrms`;
      case 'watts': return `${((vrms * vrms) / z).toFixed(4)} W`;
      case 'dBSPL': return 'N/A (requires calibration)';
      default: return '—';
    }
  }, [inputVal, fromUnit, toUnit, impedance]);

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">From</Label>
              <Select value={fromUnit} onValueChange={(v: any) => setFromUnit(v)}>
                <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u.id} value={u.id}>{u.label} — {u.desc}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="bg-secondary text-lg font-heading"
                step="any"
              />
            </div>

            <div className="flex items-center justify-center text-2xl text-muted-foreground">→</div>

            <div className="space-y-2">
              <Label className="text-xs">To</Label>
              <Select value={toUnit} onValueChange={(v: any) => setToUnit(v)}>
                <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u.id} value={u.id}>{u.label} — {u.desc}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="h-10 flex items-center px-3 rounded-md bg-secondary text-lg font-heading font-bold text-primary">
                {result}
              </div>
            </div>
          </div>

          {(fromUnit === 'watts' || toUnit === 'watts') && (
            <div className="max-w-xs">
              <Label className="text-xs">Impedance (Ω)</Label>
              <Input type="number" value={impedance} onChange={(e) => setImpedance(e.target.value)} className="bg-secondary" />
            </div>
          )}
        </div>

        {/* Reference Levels */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-heading font-semibold">Common Reference Levels</h2>
          <div className="grid gap-1">
            {REFERENCES.map((r) => (
              <div key={r.label} className="flex justify-between text-xs px-2 py-1.5 rounded bg-secondary">
                <span>{r.label}</span>
                <span className="font-medium text-foreground">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolPage>
  );
};

export default DbConverter;
