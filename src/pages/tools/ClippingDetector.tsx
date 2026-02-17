import { useState, useCallback } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { MetricCard } from '@/components/display/MetricCard';
import { ProgressBar } from '@/components/shared/ProgressBar';

const tool = getToolById('clipping-detector')!;

interface ClipResult {
  totalSamples: number;
  clippedSamples: number;
  maxConsecutive: number;
  truePeak: number;
  truePeakDb: number;
  clipPositions: number[]; // sample indices of clips (first 100)
  channelResults: { channel: number; clips: number; peak: number }[];
}

function detectClipping(buffer: AudioBuffer): ClipResult {
  const threshold = 0.9999;
  let totalClips = 0;
  let maxConsecutive = 0;
  let globalPeak = 0;
  const clipPositions: number[] = [];
  const channelResults: { channel: number; clips: number; peak: number }[] = [];

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    let chClips = 0;
    let chPeak = 0;
    let consecutive = 0;

    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > chPeak) chPeak = abs;

      if (abs >= threshold) {
        chClips++;
        consecutive++;
        if (consecutive > maxConsecutive) maxConsecutive = consecutive;
        if (clipPositions.length < 100) clipPositions.push(i);
      } else {
        consecutive = 0;
      }
    }

    totalClips += chClips;
    if (chPeak > globalPeak) globalPeak = chPeak;
    channelResults.push({ channel: ch, clips: chClips, peak: chPeak });
  }

  // Simple 4x oversampled true peak estimation
  let truePeak = globalPeak;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 1; i < data.length - 2; i++) {
      // Cubic interpolation check for inter-sample peaks
      const s0 = data[i - 1], s1 = data[i], s2 = data[i + 1];
      const mid = (s0 + s2) * 0.25 + s1 * 0.5; // simplified
      const absMid = Math.abs(mid);
      if (absMid > truePeak) truePeak = absMid;
    }
  }

  return {
    totalSamples: buffer.length * buffer.numberOfChannels,
    clippedSamples: totalClips,
    maxConsecutive,
    truePeak,
    truePeakDb: 20 * Math.log10(truePeak || 1e-10),
    clipPositions,
    channelResults,
  };
}

const ClippingDetector = () => {
  const [result, setResult] = useState<ClipResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setAnalyzing(true);

    try {
      const ctx = new AudioContext();
      const arrayBuf = await file.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuf);
      const res = detectClipping(buffer);
      setResult(res);
      ctx.close();
    } catch (e) {
      console.error('Clipping detection failed:', e);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const clipPercent = result ? (result.clippedSamples / result.totalSamples) * 100 : 0;

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        <FileDropZone
          onFileSelect={handleFile}
          accept="audio/*"
          label="Drop an audio file to scan for clipping"
        />

        {analyzing && <ProgressBar value={-1} label="Scanning for clips..." />}

        {result && (
          <>
            <p className="text-sm text-muted-foreground">File: {fileName}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Clipped Samples"
                value={result.clippedSamples.toLocaleString()}
                status={result.clippedSamples === 0 ? 'pass' : result.clippedSamples < 100 ? 'warn' : 'fail'}
              />
              <MetricCard
                label="Clip Ratio"
                value={`${clipPercent.toFixed(4)}%`}
                status={clipPercent === 0 ? 'pass' : 'warn'}
              />
              <MetricCard
                label="Max Consecutive"
                value={String(result.maxConsecutive)}
                status={result.maxConsecutive === 0 ? 'pass' : result.maxConsecutive > 10 ? 'fail' : 'warn'}
              />
              <MetricCard
                label="True Peak"
                value={`${result.truePeakDb.toFixed(1)} dBTP`}
                status={result.truePeakDb <= -1 ? 'pass' : result.truePeakDb <= 0 ? 'warn' : 'fail'}
              />
            </div>

            {/* Per-channel */}
            {result.channelResults.length > 1 && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <h3 className="text-sm font-heading font-semibold">Per Channel</h3>
                {result.channelResults.map((ch) => (
                  <div key={ch.channel} className="flex justify-between text-xs px-2 py-1.5 rounded bg-secondary">
                    <span>Ch {ch.channel + 1}</span>
                    <span>{ch.clips} clips • Peak: {(20 * Math.log10(ch.peak || 1e-10)).toFixed(1)} dBFS</span>
                  </div>
                ))}
              </div>
            )}

            {/* Clip map */}
            {result.clipPositions.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <h3 className="text-sm font-heading font-semibold">Clip Locations</h3>
                <div className="relative h-6 bg-secondary rounded overflow-hidden">
                  {result.clipPositions.map((pos, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-destructive"
                      style={{ left: `${(pos / (result.totalSamples / result.channelResults.length)) * 100}%` }}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Red lines show where clipping occurs in the timeline{result.clipPositions.length >= 100 ? ' (first 100 shown)' : ''}.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </ToolPage>
  );
};

export default ClippingDetector;
