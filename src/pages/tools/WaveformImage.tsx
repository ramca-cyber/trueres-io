import { useEffect, useRef, useState, useCallback } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAudioStore } from '@/stores/audio-store';
import { type WaveformData } from '@/types/analysis';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const tool = getToolById('waveform-image')!;

const WaveformImage = () => {
  const { loadFile, fileName, fileSize, headerInfo, pcm, decoding, decodeProgress, file } = useAudioFile();
  const { runAnalysis, getResult } = useAnalysis();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgWidth, setImgWidth] = useState(1200);
  const [imgHeight, setImgHeight] = useState(300);
  const [peakColor, setPeakColor] = useState('#F59E0B');
  const [bgColor, setBgColor] = useState('#0A0A0F');
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);

  const waveformData = getResult<WaveformData & { type: string; timestamp: number; duration: number }>('waveform');

  useEffect(() => {
    if (pcm) runAnalysis('waveform');
  }, [pcm, runAnalysis]);

  // Responsive: default width to container width
  useEffect(() => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      if (w > 200) setImgWidth(w);
    }
  }, [fileName]);

  const renderImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const data = waveformData as unknown as WaveformData;
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, imgWidth, imgHeight);

    const midY = imgHeight / 2;
    const numBuckets = data.peaks.length;
    const pxPerBucket = imgWidth / numBuckets;

    ctx.fillStyle = peakColor;
    for (let i = 0; i < numBuckets; i++) {
      const x = i * pxPerBucket;
      const peakH = data.peaks[i] * midY;
      ctx.fillRect(x, midY - peakH, Math.max(1, pxPerBucket), peakH * 2);
    }

    canvas.toBlob((blob) => {
      if (blob) setImageBlob(blob);
    }, 'image/png');
  }, [waveformData, imgWidth, imgHeight, peakColor, bgColor]);

  useEffect(() => {
    if (waveformData) renderImage();
  }, [waveformData, renderImage]);

  if (!fileName) {
    return (
      <ToolPage tool={tool}>
        <FileDropZone accept={AUDIO_ACCEPT} onFileSelect={loadFile} label="Drop your audio file here" sublabel="Any supported audio format" />
      </ToolPage>
    );
  }

  return (
    <ToolPage tool={tool}>
      <div className="space-y-4" ref={containerRef}>
        <FileInfoBar fileName={fileName} fileSize={fileSize} format={headerInfo?.format} duration={headerInfo?.duration} />
        {file && <AudioPlayer src={file} label="Preview" />}
        {decoding && <ProgressBar value={decodeProgress} label="Decoding audio..." sublabel={`${decodeProgress}%`} />}

        {waveformData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Width</label>
                <Input type="number" value={imgWidth} onChange={(e) => setImgWidth(Number(e.target.value))} min={200} max={4000} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Height</label>
                <Input type="number" value={imgHeight} onChange={(e) => setImgHeight(Number(e.target.value))} min={100} max={2000} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Waveform Color</label>
                <Input type="color" value={peakColor} onChange={(e) => setPeakColor(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Background</label>
                <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
              </div>
            </div>
            <Button variant="outline" onClick={renderImage}>Regenerate</Button>
          </>
        )}

        <canvas ref={canvasRef} className="w-full rounded-md border border-border" style={{ display: waveformData ? 'block' : 'none' }} />

        {imageBlob && (
          <DownloadButton
            blob={imageBlob}
            filename={`${fileName.replace(/\.[^.]+$/, '')}_waveform.png`}
            label="Download PNG"
          />
        )}

        <Button variant="outline" size="sm" onClick={() => useAudioStore.getState().clear()}>
          Choose different file
        </Button>
      </div>
    </ToolPage>
  );
};

export default WaveformImage;
