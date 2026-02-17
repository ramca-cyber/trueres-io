import { useState, useCallback } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { MetricCard } from '@/components/display/MetricCard';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { parseHeader, decodeAudio } from '@/engines/analysis/decoders/decoder-manager';
import { measureLUFS } from '@/engines/analysis/modules/lufs';
import { measureDynamicRange } from '@/engines/analysis/modules/dynamic-range';
import { analyzeBandwidth } from '@/engines/analysis/modules/bandwidth';
import { type LUFSResult, type DynamicRangeResult, type BandwidthResult } from '@/types/analysis';
import { type HeaderParseResult, type PCMData } from '@/types/audio';

const tool = getToolById('audio-compare')!;

interface FileAnalysis {
  name: string;
  size: number;
  header: HeaderParseResult;
  lufs: LUFSResult;
  dr: DynamicRangeResult;
  bw: BandwidthResult;
}

const AudioComparator = () => {
  const [fileA, setFileA] = useState<FileAnalysis | null>(null);
  const [fileB, setFileB] = useState<FileAnalysis | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const analyzeFile = useCallback(async (file: File, setResult: (r: FileAnalysis) => void, setLoading: (b: boolean) => void) => {
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const header = parseHeader(buffer, file.name);
      const pcm = await decodeAudio(buffer);
      const lufs = measureLUFS(pcm.channelData, pcm.sampleRate);
      const dr = measureDynamicRange(pcm.channelData, pcm.sampleRate);
      const bw = analyzeBandwidth(pcm.channelData, pcm.sampleRate);
      setResult({ name: file.name, size: file.size, header, lufs, dr, bw });
    } catch (e) {
      console.error('Analysis failed:', e);
    }
    setLoading(false);
  }, []);

  const renderAnalysis = (label: string, data: FileAnalysis | null, loading: boolean) => (
    <div className="space-y-3">
      <h3 className="text-sm font-heading font-semibold">{label}</h3>
      {loading && <ProgressBar value={50} label="Analyzing..." />}
      {data && (
        <>
          <FileInfoBar
            fileName={data.name} fileSize={data.size}
            format={data.header.format} duration={data.header.duration}
            sampleRate={data.header.sampleRate} bitDepth={data.header.bitDepth}
          />
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="LUFS" value={`${data.lufs.integrated.toFixed(1)}`} />
            <MetricCard label="True Peak" value={`${data.lufs.truePeak.toFixed(1)} dBTP`} />
            <MetricCard label="DR Score" value={`DR${data.dr.drScore}`} />
            <MetricCard label="Freq Ceiling" value={`${(data.bw.frequencyCeiling / 1000).toFixed(1)} kHz`} />
          </div>
        </>
      )}
    </div>
  );

  return (
    <ToolPage tool={tool}>
      <div className="grid md:grid-cols-2 gap-4">
        {!fileA ? (
          <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={(f) => analyzeFile(f, setFileA, setLoadingA)} label="Drop File A" sublabel="First file to compare" />
        ) : renderAnalysis('File A', fileA, loadingA)}
        {!fileB ? (
          <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={(f) => analyzeFile(f, setFileB, setLoadingB)} label="Drop File B" sublabel="Second file to compare" />
        ) : renderAnalysis('File B', fileB, loadingB)}
      </div>

      {fileA && fileB && (
        <div className="mt-4 rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-heading font-semibold">Comparison</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-medium text-muted-foreground">Metric</div>
            <div className="font-medium text-center">File A</div>
            <div className="font-medium text-center">File B</div>

            <div className="text-muted-foreground">Loudness</div>
            <div className="text-center font-mono">{fileA.lufs.integrated.toFixed(1)} LUFS</div>
            <div className="text-center font-mono">{fileB.lufs.integrated.toFixed(1)} LUFS</div>

            <div className="text-muted-foreground">Dynamic Range</div>
            <div className="text-center font-mono">DR{fileA.dr.drScore}</div>
            <div className="text-center font-mono">DR{fileB.dr.drScore}</div>

            <div className="text-muted-foreground">True Peak</div>
            <div className="text-center font-mono">{fileA.lufs.truePeak.toFixed(1)} dBTP</div>
            <div className="text-center font-mono">{fileB.lufs.truePeak.toFixed(1)} dBTP</div>

            <div className="text-muted-foreground">Freq Ceiling</div>
            <div className="text-center font-mono">{(fileA.bw.frequencyCeiling / 1000).toFixed(1)} kHz</div>
            <div className="text-center font-mono">{(fileB.bw.frequencyCeiling / 1000).toFixed(1)} kHz</div>
          </div>
        </div>
      )}
    </ToolPage>
  );
};
export default AudioComparator;
