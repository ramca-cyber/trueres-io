import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const tool = getToolById('surround-reference')!;

const LAYOUTS = [
  {
    name: '2.0 Stereo',
    channels: 2,
    speakers: [
      { name: 'Front Left (FL)', angle: '30° left' },
      { name: 'Front Right (FR)', angle: '30° right' },
    ],
  },
  {
    name: '2.1',
    channels: 3,
    speakers: [
      { name: 'Front Left (FL)', angle: '30° left' },
      { name: 'Front Right (FR)', angle: '30° right' },
      { name: 'Subwoofer (LFE)', angle: 'Flexible placement' },
    ],
  },
  {
    name: '5.1 Surround',
    channels: 6,
    speakers: [
      { name: 'Front Left (FL)', angle: '22-30° left' },
      { name: 'Center (C)', angle: '0° (directly ahead)' },
      { name: 'Front Right (FR)', angle: '22-30° right' },
      { name: 'Surround Left (SL)', angle: '110-120° left' },
      { name: 'Surround Right (SR)', angle: '110-120° right' },
      { name: 'Subwoofer (LFE)', angle: 'Front, near center' },
    ],
  },
  {
    name: '7.1 Surround',
    channels: 8,
    speakers: [
      { name: 'Front Left (FL)', angle: '22-30° left' },
      { name: 'Center (C)', angle: '0°' },
      { name: 'Front Right (FR)', angle: '22-30° right' },
      { name: 'Side Left (SL)', angle: '90° left' },
      { name: 'Side Right (SR)', angle: '90° right' },
      { name: 'Rear Left (RL)', angle: '135-150° left' },
      { name: 'Rear Right (RR)', angle: '135-150° right' },
      { name: 'Subwoofer (LFE)', angle: 'Front, near center' },
    ],
  },
  {
    name: '7.1.4 Atmos',
    channels: 12,
    speakers: [
      { name: 'Front Left (FL)', angle: '22-30° left' },
      { name: 'Center (C)', angle: '0°' },
      { name: 'Front Right (FR)', angle: '22-30° right' },
      { name: 'Side Left (SL)', angle: '90° left' },
      { name: 'Side Right (SR)', angle: '90° right' },
      { name: 'Rear Left (RL)', angle: '135-150° left' },
      { name: 'Rear Right (RR)', angle: '135-150° right' },
      { name: 'Subwoofer (LFE)', angle: 'Front, near center' },
      { name: 'Top Front Left', angle: '45° up, 30° left' },
      { name: 'Top Front Right', angle: '45° up, 30° right' },
      { name: 'Top Rear Left', angle: '45° up, 135° left' },
      { name: 'Top Rear Right', angle: '45° up, 135° right' },
    ],
  },
];

const FORMATS = [
  { name: 'Dolby Digital (AC-3)', channels: '5.1', bitrate: '640 kbps max', lossy: true, notes: 'Standard for DVD and broadcast' },
  { name: 'Dolby Digital Plus (E-AC-3)', channels: '7.1', bitrate: '6.144 Mbps max', lossy: true, notes: 'Streaming standard (Netflix, Disney+)' },
  { name: 'Dolby TrueHD', channels: '7.1', bitrate: 'Lossless (~18 Mbps)', lossy: false, notes: 'Blu-ray lossless codec' },
  { name: 'Dolby Atmos', channels: '7.1.4+', bitrate: 'Object-based', lossy: false, notes: 'Wraps TrueHD or DD+ with spatial metadata' },
  { name: 'DTS', channels: '5.1', bitrate: '1.536 Mbps', lossy: true, notes: 'Original DTS for DVD/Blu-ray' },
  { name: 'DTS-HD MA', channels: '7.1', bitrate: 'Lossless (~24.5 Mbps)', lossy: false, notes: 'Blu-ray lossless competitor to TrueHD' },
  { name: 'DTS:X', channels: '7.1.4+', bitrate: 'Object-based', lossy: false, notes: 'DTS immersive audio, open standard' },
  { name: 'LPCM', channels: '7.1', bitrate: 'Uncompressed', lossy: false, notes: 'Raw PCM on Blu-ray, highest quality' },
];

const CROSSOVERS = [
  { speaker: 'Large floor-standing', recommended: '40-60 Hz' },
  { speaker: 'Medium bookshelf', recommended: '80 Hz' },
  { speaker: 'Small satellite', recommended: '100-120 Hz' },
  { speaker: 'Soundbar (with sub)', recommended: '80-120 Hz' },
  { speaker: 'THX standard', recommended: '80 Hz' },
];

const SurroundReference = () => {
  return (
    <ToolPage tool={tool}>
      <Tabs defaultValue="layouts" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="layouts">Channel Layouts</TabsTrigger>
          <TabsTrigger value="formats">Surround Formats</TabsTrigger>
          <TabsTrigger value="crossover">Crossover Guide</TabsTrigger>
          <TabsTrigger value="checklist">Setup Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="layouts" className="space-y-4">
          {LAYOUTS.map((layout) => (
            <div key={layout.name} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <h3 className="text-sm font-heading font-semibold">{layout.name} <span className="text-muted-foreground font-normal">({layout.channels} ch)</span></h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {layout.speakers.map((s) => (
                  <div key={s.name} className="text-xs flex justify-between px-2 py-1 rounded bg-secondary">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">{s.angle}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="formats">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary">
                  <th className="text-left p-2 font-medium">Format</th>
                  <th className="text-left p-2 font-medium">Channels</th>
                  <th className="text-left p-2 font-medium">Bitrate</th>
                  <th className="text-left p-2 font-medium">Type</th>
                  <th className="text-left p-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {FORMATS.map((f) => (
                  <tr key={f.name} className="border-b border-border/50">
                    <td className="p-2 font-medium">{f.name}</td>
                    <td className="p-2">{f.channels}</td>
                    <td className="p-2">{f.bitrate}</td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${f.lossy ? 'bg-status-warn/20 text-status-warn' : 'bg-status-pass/20 text-status-pass'}`}>
                        {f.lossy ? 'Lossy' : 'Lossless'}
                      </span>
                    </td>
                    <td className="p-2 text-muted-foreground">{f.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="crossover" className="space-y-3">
          <p className="text-xs text-muted-foreground">Recommended crossover frequency by speaker type. Set in your AVR/receiver settings.</p>
          {CROSSOVERS.map((c) => (
            <div key={c.speaker} className="flex justify-between items-center rounded-lg border border-border bg-card p-3">
              <span className="text-sm font-medium">{c.speaker}</span>
              <span className="text-sm font-heading font-bold text-primary">{c.recommended}</span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="checklist" className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <h3 className="text-sm font-heading font-semibold">Home Theater Setup Checklist</h3>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Position speakers at recommended angles (see Channel Layouts tab)</li>
              <li>Set all speakers to "Small" in receiver settings (routes bass to sub)</li>
              <li>Set crossover frequency based on speaker size (see Crossover Guide)</li>
              <li>Run receiver's auto-calibration (e.g., Audyssey, YPAO, MCACC)</li>
              <li>Set subwoofer volume: play 75 dB test tone, match sub to mains</li>
              <li>Verify channel assignment with the Speaker Channel Test tool</li>
              <li>Check phase/polarity — all speakers should be wired consistently</li>
              <li>Set listening level reference: -20 dBFS = 75 dB SPL at seat</li>
              <li>Enable Dynamic Range Compression (DRC) for late-night listening</li>
              <li>Test with known reference material (e.g., THX Optimizer disc)</li>
            </ol>
          </div>
        </TabsContent>
      </Tabs>
    </ToolPage>
  );
};

export default SurroundReference;
