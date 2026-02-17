import { Helmet } from 'react-helmet-async';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';

const tool = getToolById('format-reference')!;

const formats = [
  { name: 'WAV', type: 'Lossless', compression: 'None', quality: '★★★★★', ext: '.wav', notes: 'Uncompressed PCM. Universal compatibility. Large files.' },
  { name: 'FLAC', type: 'Lossless', compression: '~40-60%', quality: '★★★★★', ext: '.flac', notes: 'Lossless compression. Open source. Widely supported.' },
  { name: 'ALAC', type: 'Lossless', compression: '~40-60%', quality: '★★★★★', ext: '.m4a', notes: 'Apple lossless. Native Apple device support.' },
  { name: 'AIFF', type: 'Lossless', compression: 'None', quality: '★★★★★', ext: '.aiff', notes: 'Apple uncompressed. Similar to WAV.' },
  { name: 'MP3', type: 'Lossy', compression: '~90%', quality: '★★★☆☆', ext: '.mp3', notes: 'Universal. Best at 320kbps VBR. Lossy.' },
  { name: 'AAC', type: 'Lossy', compression: '~90%', quality: '★★★★☆', ext: '.m4a', notes: 'Better than MP3 at same bitrate. iTunes/YouTube default.' },
  { name: 'OGG Vorbis', type: 'Lossy', compression: '~90%', quality: '★★★★☆', ext: '.ogg', notes: 'Open source. Spotify uses this internally.' },
  { name: 'Opus', type: 'Lossy', compression: '~95%', quality: '★★★★★', ext: '.opus', notes: 'Best lossy codec. Great at low bitrates. VoIP optimized.' },
  { name: 'WMA', type: 'Lossy', compression: '~90%', quality: '★★★☆☆', ext: '.wma', notes: 'Microsoft format. Limited device support.' },
];

const FormatReference = () => (
  <ToolPage tool={tool}>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 px-3 font-heading font-semibold">Format</th>
            <th className="py-2 px-3 font-heading font-semibold">Type</th>
            <th className="py-2 px-3 font-heading font-semibold hidden sm:table-cell">Compression</th>
            <th className="py-2 px-3 font-heading font-semibold">Quality</th>
            <th className="py-2 px-3 font-heading font-semibold hidden md:table-cell">Notes</th>
          </tr>
        </thead>
        <tbody>
          {formats.map((f) => (
            <tr key={f.name} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
              <td className="py-2 px-3 font-mono font-medium">{f.name}</td>
              <td className="py-2 px-3">
                <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${f.type === 'Lossless' ? 'bg-status-pass/10 text-status-pass' : 'bg-status-warn/10 text-status-warn'}`}>
                  {f.type}
                </span>
              </td>
              <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell">{f.compression}</td>
              <td className="py-2 px-3">{f.quality}</td>
              <td className="py-2 px-3 text-xs text-muted-foreground hidden md:table-cell">{f.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </ToolPage>
);

export default FormatReference;
