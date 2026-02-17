import { useState, useCallback } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Button } from '@/components/ui/button';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT, formatFileSize, formatDuration } from '@/config/constants';
import { parseHeader, decodeAudio } from '@/engines/analysis/decoders/decoder-manager';
import { measureLUFS } from '@/engines/analysis/modules/lufs';
import { measureDynamicRange } from '@/engines/analysis/modules/dynamic-range';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, RotateCcw, Plus } from 'lucide-react';

const tool = getToolById('batch-analyzer')!;

interface TrackResult {
  name: string;
  size: number;
  format: string;
  duration: number;
  sampleRate: number;
  bitDepth: number;
  lufs: number;
  truePeak: number;
  dr: number;
}

type SortKey = keyof TrackResult;

const BatchAnalyzer = () => {
  const [results, setResults] = useState<TrackResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progress, setProgress] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const handleFiles = useCallback(async (files: File[]) => {
    setProcessing(true);
    const existingResults = [...results];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgressText(`Analyzing ${file.name} (${i + 1}/${files.length})`);
      setProgress(Math.round(((i) / files.length) * 100));

      try {
        const buffer = await file.arrayBuffer();
        const header = parseHeader(buffer, file.name);
        const pcm = await decodeAudio(buffer);
        const lufs = measureLUFS(pcm.channelData, pcm.sampleRate);
        const dr = measureDynamicRange(pcm.channelData, pcm.sampleRate);

        existingResults.push({
          name: file.name,
          size: file.size,
          format: header.format,
          duration: header.duration || pcm.duration,
          sampleRate: header.sampleRate,
          bitDepth: header.bitDepth,
          lufs: lufs.integrated,
          truePeak: lufs.truePeak,
          dr: dr.drScore,
        });
        setResults([...existingResults]);
      } catch (e) {
        console.warn(`Failed to analyze ${file.name}:`, e);
        existingResults.push({
          name: file.name, size: file.size, format: 'error',
          duration: 0, sampleRate: 0, bitDepth: 0,
          lufs: 0, truePeak: 0, dr: 0,
        });
        setResults([...existingResults]);
      }
    }

    setProgress(100);
    setProcessing(false);
  }, [results]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sortedResults = [...results].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    const cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
    return sortAsc ? cmp : -cmp;
  });

  const exportCSV = () => {
    const headers = ['#', 'Track', 'Duration', 'LUFS', 'True Peak', 'DR', 'Sample Rate', 'Bit Depth'];
    const rows = results.map((r, i) => [
      i + 1, r.name, r.duration > 0 ? r.duration.toFixed(2) : '',
      r.lufs ? r.lufs.toFixed(1) : '', r.truePeak ? r.truePeak.toFixed(1) : '',
      r.dr ? `DR${r.dr}` : '', r.sampleRate || '', r.bitDepth || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'batch-analysis.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const sortIcon = (key: SortKey) => sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '';

  return (
    <ToolPage tool={tool}>
      {results.length === 0 && !processing ? (
        <FileDropZone
          accept={AUDIO_ACCEPT}
          onFileSelect={(f) => handleFiles([f])}
          multiple
          onMultipleFiles={handleFiles}
          label="Drop album files here"
          sublabel="Drop one or more audio files for batch analysis"
        />
      ) : (
        <div className="space-y-4">
          {processing && <ProgressBar value={progress} label={progressText} sublabel={`${progress}%`} />}

          {results.length > 0 && (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs cursor-pointer" onClick={() => handleSort('name')}>#</TableHead>
                    <TableHead className="text-xs cursor-pointer" onClick={() => handleSort('name')}>Track{sortIcon('name')}</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => handleSort('duration')}>Duration{sortIcon('duration')}</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => handleSort('lufs')}>LUFS{sortIcon('lufs')}</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => handleSort('truePeak')}>Peak{sortIcon('truePeak')}</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => handleSort('dr')}>DR{sortIcon('dr')}</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => handleSort('sampleRate')}>Sample Rate{sortIcon('sampleRate')}</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => handleSort('bitDepth')}>Bit Depth{sortIcon('bitDepth')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedResults.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium max-w-[200px] truncate">{r.name}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{r.duration > 0 ? formatDuration(r.duration) : '—'}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{r.lufs ? r.lufs.toFixed(1) : '—'}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{r.truePeak ? r.truePeak.toFixed(1) : '—'}</TableCell>
                      <TableCell className={`text-xs text-right font-mono font-bold ${r.dr >= 10 ? 'text-status-pass' : r.dr >= 6 ? 'text-status-warn' : 'text-destructive'}`}>
                        {r.dr ? `DR${r.dr}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">{r.sampleRate ? `${(r.sampleRate / 1000).toFixed(1)}kHz` : '—'}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{r.bitDepth ? `${r.bitDepth}-bit` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!processing && results.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Album avg: {(results.reduce((s, r) => s + r.lufs, 0) / results.length).toFixed(1)} LUFS | 
                DR{Math.round(results.reduce((s, r) => s + r.dr, 0) / results.length)}
              </p>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-1" /> Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = AUDIO_ACCEPT;
                  input.onchange = (e) => {
                    const files = Array.from((e.target as HTMLInputElement).files || []);
                    if (files.length) handleFiles(files);
                  };
                  input.click();
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Add more
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setResults([])}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default BatchAnalyzer;
