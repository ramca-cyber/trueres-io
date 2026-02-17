import { useState, useCallback } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT, formatFileSize, formatDuration } from '@/config/constants';
import { parseHeader, decodeAudio } from '@/engines/analysis/decoders/decoder-manager';
import { measureLUFS } from '@/engines/analysis/modules/lufs';
import { measureDynamicRange } from '@/engines/analysis/modules/dynamic-range';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

const BatchAnalyzer = () => {
  const [results, setResults] = useState<TrackResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFiles = useCallback(async (files: File[]) => {
    setProcessing(true);
    setResults([]);
    const newResults: TrackResult[] = [];

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

        newResults.push({
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
        setResults([...newResults]);
      } catch (e) {
        console.warn(`Failed to analyze ${file.name}:`, e);
        newResults.push({
          name: file.name, size: file.size, format: 'error',
          duration: 0, sampleRate: 0, bitDepth: 0,
          lufs: 0, truePeak: 0, dr: 0,
        });
        setResults([...newResults]);
      }
    }

    setProgress(100);
    setProcessing(false);
  }, []);

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
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Track</TableHead>
                    <TableHead className="text-xs text-right">Duration</TableHead>
                    <TableHead className="text-xs text-right">LUFS</TableHead>
                    <TableHead className="text-xs text-right">Peak</TableHead>
                    <TableHead className="text-xs text-right">DR</TableHead>
                    <TableHead className="text-xs text-right">Sample Rate</TableHead>
                    <TableHead className="text-xs text-right">Bit Depth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
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
            <div className="flex gap-3">
              <p className="text-xs text-muted-foreground">
                Album avg: {(results.reduce((s, r) => s + r.lufs, 0) / results.length).toFixed(1)} LUFS | 
                DR{Math.round(results.reduce((s, r) => s + r.dr, 0) / results.length)}
              </p>
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
};
export default BatchAnalyzer;
