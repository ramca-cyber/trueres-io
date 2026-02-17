import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';

const tool = getToolById('bluetooth-codecs')!;

const codecs = [
  { name: 'LDAC', bitrate: 'Up to 990 kbps', quality: '★★★★★', latency: '~200ms', support: 'Sony, Android 8+', notes: 'Near-lossless. Best Bluetooth audio quality.' },
  { name: 'aptX HD', bitrate: '576 kbps', quality: '★★★★☆', latency: '~150ms', support: 'Qualcomm devices', notes: '24-bit audio. Good for music listening.' },
  { name: 'aptX Adaptive', bitrate: '24-420 kbps', quality: '★★★★☆', latency: '~80ms', support: 'Newer Qualcomm', notes: 'Dynamic bitrate. Low latency mode.' },
  { name: 'aptX', bitrate: '352 kbps', quality: '★★★☆☆', latency: '~120ms', support: 'Qualcomm devices', notes: 'CD-like quality. Widely supported on Android.' },
  { name: 'AAC', bitrate: '256 kbps', quality: '★★★☆☆', latency: '~200ms', support: 'Apple, Android', notes: 'Apple default. Quality varies by implementation.' },
  { name: 'SBC', bitrate: '198-345 kbps', quality: '★★☆☆☆', latency: '~200ms', support: 'Universal', notes: 'Mandatory fallback codec. Lowest quality.' },
  { name: 'LC3/LC3plus', bitrate: '160-320 kbps', quality: '★★★★☆', latency: '~100ms', support: 'Bluetooth LE Audio', notes: 'Next-gen. Better quality at lower bitrates.' },
];

const BluetoothCodecs = () => (
  <ToolPage tool={tool}>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 px-3 font-heading font-semibold">Codec</th>
            <th className="py-2 px-3 font-heading font-semibold">Max Bitrate</th>
            <th className="py-2 px-3 font-heading font-semibold">Quality</th>
            <th className="py-2 px-3 font-heading font-semibold hidden sm:table-cell">Latency</th>
            <th className="py-2 px-3 font-heading font-semibold hidden md:table-cell">Device Support</th>
          </tr>
        </thead>
        <tbody>
          {codecs.map((c) => (
            <tr key={c.name} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
              <td className="py-2 px-3 font-mono font-medium">{c.name}</td>
              <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{c.bitrate}</td>
              <td className="py-2 px-3">{c.quality}</td>
              <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell">{c.latency}</td>
              <td className="py-2 px-3 text-xs text-muted-foreground hidden md:table-cell">{c.support}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </ToolPage>
);

export default BluetoothCodecs;
