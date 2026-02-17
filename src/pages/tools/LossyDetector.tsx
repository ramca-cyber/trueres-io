import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ToolPage } from '@/components/shared/ToolPage';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { MetricCard } from '@/components/display/MetricCard';
import { SpectrogramCanvas } from '@/components/visualizations/SpectrogramCanvas';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT, formatFrequency } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { type LossyDetectResult, type BandwidthResult, type SpectrogramData } from '@/types/analysis';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const tool = getToolById('lossy-detector')!;

const LossyDetector = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress, file } = useAudioFile();

  useEffect(() => {
    const pending = useFileTransferStore.getState().consumePendingFile();
    if (pending) loadFile(pending);
  }, []);
  const { runAnalysis, getResult } = useAnalysis();

  const lossyResult = getResult<LossyDetectResult>('lossyDetect');
  const bandwidthResult = getResult<BandwidthResult>('bandwidth');
  const spectrogramData = getResult<SpectrogramData & { type: string; timestamp: number; duration: number }>('spectrogram');

  useEffect(() => {
    if (pcm) {
      runAnalysis('lossyDetect');
      runAnalysis('bandwidth');
      runAnalysis('spectrogram');
    }
  }, [pcm, runAnalysis]);

  if (!fileName) {
    return (
      <ToolPage tool={tool}>
        <FileDropZone accept=".wav,.flac,.aiff" onFileSelect={loadFile} label="Drop your lossless file here" sublabel="WAV, FLAC, AIFF — test if it was transcoded from lossy" />
      </ToolPage>
    );
  }

  const analyzing = !lossyResult && !!pcm;

  return (
    <ToolPage tool={tool}>
      <div className="space-y-4">
        <FileInfoBar
          fileName={fileName} fileSize={fileSize}
          format={headerInfo?.format} duration={headerInfo?.duration}
          sampleRate={headerInfo?.sampleRate} bitDepth={headerInfo?.bitDepth}
          channels={headerInfo?.channels}
        />
        {file && <AudioPlayer src={file} label="Preview" />}

        {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." sublabel={`${decodeProgress}%`} />}
        {analyzing && <ProgressBar value={50} label="Analyzing for lossy transcoding..." />}

        {lossyResult && (
          <>
            <div className={`rounded-lg p-4 flex items-start gap-3 ${
              lossyResult.isLossy
                ? 'bg-destructive/10 border border-destructive/30'
                : 'bg-status-pass/10 border border-status-pass/30'
            }`}>
              {lossyResult.isLossy ? (
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-status-pass shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-heading font-semibold text-sm">
                  {lossyResult.isLossy ? 'Lossy Transcode Detected' : 'Genuine Lossless'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {lossyResult.isLossy
                    ? `This file appears to have been transcoded from a lossy source. ${lossyResult.encoderFingerprint || ''}`
                    : 'No signs of lossy transcoding detected. This file appears to be genuine lossless audio.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Confidence" value={`${lossyResult.confidence}%`} />
              <MetricCard label="Spectral Holes" value={lossyResult.spectralHoles.toString()} status={lossyResult.spectralHoles > 3 ? 'fail' : 'pass'} />
              {bandwidthResult && (
                <>
                  <MetricCard label="Freq Ceiling" value={formatFrequency(bandwidthResult.frequencyCeiling)} />
                  <MetricCard label="Source Guess" value={bandwidthResult.sourceGuess} />
                </>
              )}
            </div>

            {lossyResult.encoderFingerprint && (
              <div className="rounded-md bg-card border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">Encoder Fingerprint</p>
                <p className="text-sm font-mono mt-1">{lossyResult.encoderFingerprint}</p>
              </div>
            )}
          </>
        )}

        {spectrogramData && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Spectrogram</h3>
            <p className="text-xs text-muted-foreground">Look for a sharp frequency cutoff — a clear sign of lossy encoding.</p>
            <SpectrogramCanvas data={spectrogramData as unknown as SpectrogramData} />
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => useAudioStore.getState().clear()}>
          Analyze another file
        </Button>
      </div>
    </ToolPage>
  );
};

export default LossyDetector;
