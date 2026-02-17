import { getToolById } from '@/config/tool-registry';
import { ToolPage } from '@/components/shared/ToolPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const tool = getToolById('headphone-guide')!;

const HP_TYPES = [
  { type: 'Open-Back', pros: 'Wide soundstage, natural sound, breathable', cons: 'Sound leakage, no isolation', best: 'Home listening, mixing', examples: 'Sennheiser HD 600, Beyerdynamic DT 990, HiFiMAN Sundara' },
  { type: 'Closed-Back', pros: 'Noise isolation, no leakage, portable', cons: 'Narrower soundstage, can feel warm', best: 'Commuting, recording, noisy environments', examples: 'Sony MDR-7506, Audio-Technica ATH-M50x, Beyerdynamic DT 770' },
  { type: 'Planar Magnetic', pros: 'Low distortion, fast transients, detailed bass', cons: 'Heavier, often need amplification', best: 'Critical listening, audiophile use', examples: 'HiFiMAN Ananda, Audeze LCD-2, Dan Clark Aeon' },
  { type: 'Electrostatic', pros: 'Ultimate detail and clarity, near-zero distortion', cons: 'Requires dedicated amp, very expensive', best: 'Summit-fi listening', examples: 'STAX SR-009, STAX L300, Koss ESP/95X' },
  { type: 'IEM (In-Ear)', pros: 'Portable, excellent isolation, comfortable', cons: 'Fit varies, tip selection matters', best: 'Stage monitoring, travel, exercise', examples: 'Moondrop Blessing 3, Shure SE846, Etymotic ER4XR' },
];

const IMPEDANCE_GUIDE = [
  { range: '16-32Ω', sensitivity: '100+ dB/mW', amp: 'Phone/laptop sufficient', notes: 'Most IEMs and portable headphones' },
  { range: '32-80Ω', sensitivity: '95-105 dB/mW', amp: 'Phone works, portable DAC/amp recommended', notes: 'Most consumer over-ears' },
  { range: '80-250Ω', sensitivity: '90-100 dB/mW', amp: 'Dedicated DAC/amp recommended', notes: 'Studio headphones (DT 770/880/990)' },
  { range: '250-600Ω', sensitivity: '96-103 dB/mW', amp: 'Desktop amp required', notes: 'High-impedance audiophile (HD 600, DT 880 600Ω)' },
];

const TARGET_CURVES = [
  { name: 'Harman Target', desc: 'Developed by Harman International through extensive listener preference research. Slightly bass-boosted with a mild treble shelf. The most widely preferred curve for general listening.', use: 'General listening, consumer preference' },
  { name: 'Diffuse Field', desc: 'Simulates the frequency response of a flat speaker in a diffuse sound field. Tends to sound bright and analytical. Used as a reference in many studio headphones.', use: 'Mixing, mastering, analytical listening' },
  { name: 'Free Field', desc: 'Simulates a flat speaker in an anechoic chamber (no reflections). Even brighter than diffuse field. Rarely used as a consumer target.', use: 'Research, measurement reference' },
  { name: 'IEF Neutral', desc: 'A community-derived target that aims for perceived neutrality with IEMs. Less bass emphasis than Harman IE, more natural midrange.', use: 'IEM tuning, critical listening' },
];

export default function HeadphoneGuide() {
  return (
    <ToolPage tool={tool}>
      <Tabs defaultValue="types" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="types">Headphone Types</TabsTrigger>
          <TabsTrigger value="impedance">Impedance & Amps</TabsTrigger>
          <TabsTrigger value="targets">Target Curves</TabsTrigger>
          <TabsTrigger value="eq">EQ Tips</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-4">
          {HP_TYPES.map(h => (
            <Card key={h.type}>
              <CardHeader><CardTitle className="text-base">{h.type}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="font-medium text-status-pass">Pros:</span> {h.pros}</div>
                <div><span className="font-medium text-status-fail">Cons:</span> {h.cons}</div>
                <div><span className="font-medium">Best for:</span> {h.best}</div>
                <div className="text-muted-foreground"><span className="font-medium">Examples:</span> {h.examples}</div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="impedance">
          <Card>
            <CardHeader><CardTitle className="text-base">Impedance & Amplification Guide</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Impedance</TableHead>
                    <TableHead>Sensitivity</TableHead>
                    <TableHead>Amplification</TableHead>
                    <TableHead className="hidden md:table-cell">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {IMPEDANCE_GUIDE.map(row => (
                    <TableRow key={row.range}>
                      <TableCell className="font-mono font-medium">{row.range}</TableCell>
                      <TableCell>{row.sensitivity}</TableCell>
                      <TableCell>{row.amp}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{row.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4">
                Rule of thumb: impedance alone doesn't tell the full story. A low-impedance planar (e.g., HiFiMAN Susvara at 60Ω but 83 dB/mW) can be harder to drive than a 300Ω dynamic. Always check sensitivity (dB/mW).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="space-y-4">
          {TARGET_CURVES.map(tc => (
            <Card key={tc.name}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {tc.name}
                  <Badge variant="outline" className="text-xs font-normal">{tc.use}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{tc.desc}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="eq">
          <Card>
            <CardHeader><CardTitle className="text-base">EQ Tips for Common Headphones</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium">General Approach</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                  <li>Use parametric EQ (PEQ) for precise corrections — graphic EQ is too coarse</li>
                  <li>Cut before you boost — subtractive EQ is cleaner</li>
                  <li>Start with auto-EQ databases (AutoEQ, Crinacle, Oratory1990) for your specific headphone model</li>
                  <li>Use narrow Q (2-5) for fixing resonance peaks, wide Q (0.5-1.5) for tonal tilt</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">Common Fixes</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                  <li><strong>Sibilance (6-9 kHz):</strong> Apply a narrow cut of -3 to -6 dB around the offending peak</li>
                  <li><strong>Thin bass:</strong> Low shelf boost (+2 to +4 dB) at 100-150 Hz</li>
                  <li><strong>Harsh upper mids:</strong> Cut 2-4 kHz by 2-3 dB with Q around 1.5</li>
                  <li><strong>Veiled/dark sound:</strong> High shelf boost (+2 dB) above 8 kHz</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">Recommended Software</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                  <li><strong>Windows:</strong> Equalizer APO + Peace GUI (free, system-wide)</li>
                  <li><strong>macOS:</strong> SoundSource or eqMac</li>
                  <li><strong>Android:</strong> Wavelet (AutoEQ built-in)</li>
                  <li><strong>iOS:</strong> EQ in Music app settings, or use player-specific EQ</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ToolPage>
  );
}
