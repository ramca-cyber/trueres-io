import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ToolPage } from '@/components/shared/ToolPage';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { MetricCard } from '@/components/display/MetricCard';
import { VerdictBanner } from '@/components/display/VerdictBanner';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { type VerdictResult, type BitDepthResult, type BandwidthResult, type LossyDetectResult, type DynamicRangeResult } from '@/types/analysis';

const tool = getToolById('hires-verifier')!;

const HiResVerifier = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress, decodeError, file } = useAudioFile();

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) loadFile(pending);
  }, []);
  const { runAnalysis, getResult } = useAnalysis();
  const [analyzing, setAnalyzing] = useState(false);

  // Run analyses when PCM is ready
  useEffect(() => {
    if (!pcm) return;
    setAnalyzing(true);
    runAnalysis('verdict').then(() => setAnalyzing(false));
  }, [pcm, runAnalysis]);

  const verdict = getResult<VerdictResult>('verdict');
  const bitDepth = getResult<BitDepthResult>('bitDepth');
  const bandwidth = getResult<BandwidthResult>('bandwidth');
  const lossy = getResult<LossyDetectResult>('lossyDetect');
  const dr = getResult<DynamicRangeResult>('dynamicRange');

  return (
    <ToolPage
      tool={tool}
      faq={[
        { q: 'What does "hi-res" audio mean?', a: 'Hi-res audio typically means audio with a sample rate above 44.1kHz and/or bit depth above 16-bit, exceeding CD quality.' },
        { q: 'Can a FLAC file be fake hi-res?', a: 'Yes. A file can be 24-bit/96kHz FLAC but actually contain upsampled 16-bit/44.1kHz content. This tool detects that.' },
        { q: 'What formats are supported?', a: 'WAV, FLAC, AIFF, MP3, OGG, AAC, and M4A files can be analyzed.' },
      ]}
    >
      {!fileName && (
        <FileDropZone
          accept={AUDIO_ACCEPT}
          onFileSelect={loadFile}
          label="Drop your audio file here"
          sublabel="WAV, FLAC, AIFF, MP3, OGG, AAC, M4A"
        />
      )}

      {fileName && (
        <div className="space-y-4">
          <FileInfoBar
            fileName={fileName}
            fileSize={fileSize}
            format={headerInfo?.format}
            duration={headerInfo?.duration}
            sampleRate={headerInfo?.sampleRate}
            bitDepth={headerInfo?.bitDepth}
            channels={headerInfo?.channels}
          />
          {file && <AudioPlayer src={file} label="Preview" />}

          {decoding && (
            <ProgressBar value={decodeProgress} label="Decoding audio..." sublabel={`${decodeProgress}%`} />
          )}

          {decodeError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <p className="font-medium">Decode Error</p>
              <p className="text-xs mt-1">{decodeError}</p>
            </div>
          )}

          {analyzing && !verdict && (
            <ProgressBar value={60} label="Analyzing..." sublabel="Running hi-res verification" />
          )}

          {verdict && <VerdictBanner verdict={verdict} />}

          {(bitDepth || bandwidth || lossy || dr) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {bitDepth && (
                <MetricCard
                  label="Effective Bit Depth"
                  value={`${bitDepth.effectiveBitDepth}-bit`}
                  subtext={`Reported: ${bitDepth.reportedBitDepth}-bit`}
                  status={bitDepth.effectiveBitDepth >= bitDepth.reportedBitDepth ? 'pass' : 'fail'}
                />
              )}
              {bandwidth && (
                <MetricCard
                  label="Freq Ceiling"
                  value={`${(bandwidth.frequencyCeiling / 1000).toFixed(1)} kHz`}
                  subtext={bandwidth.sourceGuess}
                  status={bandwidth.isUpsampled ? 'fail' : 'pass'}
                />
              )}
              {lossy && (
                <MetricCard
                  label="Lossy Artifacts"
                  value={lossy.isLossy ? 'Detected' : 'None'}
                  subtext={`${lossy.spectralHoles} spectral holes`}
                  status={lossy.isLossy ? 'fail' : 'pass'}
                />
              )}
              {dr && (
                <MetricCard
                  label="Dynamic Range"
                  value={`DR${dr.drScore}`}
                  subtext={`Peak: ${dr.peakDbfs.toFixed(1)} dBFS`}
                  status={dr.drScore >= 10 ? 'pass' : dr.drScore >= 6 ? 'warn' : 'fail'}
                />
              )}
            </div>
          )}

          <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => useAudioStore.getState().clear()}>
            Analyze another file
          </Button>
        </div>
      )}
    </ToolPage>
  );
};

export default HiResVerifier;
