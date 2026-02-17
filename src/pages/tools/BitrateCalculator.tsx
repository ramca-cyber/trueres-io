import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatFileSize } from '@/config/constants';

const tool = getToolById('bitrate-calculator')!;

const BitrateCalculator = () => {
  const [format, setFormat] = useState('wav');
  const [sampleRate, setSampleRate] = useState(44100);
  const [bitDepth, setBitDepth] = useState(16);
  const [channels, setChannels] = useState(2);
  const [duration, setDuration] = useState(180); // 3 minutes
  const [bitrate, setBitrate] = useState(320); // kbps for lossy

  const isLossless = ['wav', 'flac', 'aiff'].includes(format);

  const calculateSize = () => {
    if (isLossless) {
      const rawSize = (sampleRate * bitDepth * channels * duration) / 8;
      const compressionRatio = format === 'flac' ? 0.6 : 1.0;
      return rawSize * compressionRatio;
    }
    return (bitrate * 1000 * duration) / 8;
  };

  const fileSize = calculateSize();

  return (
    <ToolPage tool={tool}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="wav">WAV (uncompressed)</SelectItem>
                <SelectItem value="flac">FLAC (lossless)</SelectItem>
                <SelectItem value="aiff">AIFF (uncompressed)</SelectItem>
                <SelectItem value="mp3">MP3 (lossy)</SelectItem>
                <SelectItem value="aac">AAC (lossy)</SelectItem>
                <SelectItem value="ogg">OGG Vorbis (lossy)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLossless ? (
            <>
              <div>
                <Label className="text-xs">Sample Rate (Hz)</Label>
                <Input type="number" value={sampleRate} onChange={(e) => setSampleRate(Number(e.target.value))} className="bg-secondary" />
              </div>
              <div>
                <Label className="text-xs">Bit Depth</Label>
                <Select value={String(bitDepth)} onValueChange={(v) => setBitDepth(Number(v))}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16">16-bit</SelectItem>
                    <SelectItem value="24">24-bit</SelectItem>
                    <SelectItem value="32">32-bit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div>
              <Label className="text-xs">Bitrate (kbps)</Label>
              <Input type="number" value={bitrate} onChange={(e) => setBitrate(Number(e.target.value))} className="bg-secondary" />
            </div>
          )}
          <div>
            <Label className="text-xs">Channels</Label>
            <Select value={String(channels)} onValueChange={(v) => setChannels(Number(v))}>
              <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Mono</SelectItem>
                <SelectItem value="2">Stereo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Duration (seconds)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="bg-secondary" />
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-xs text-muted-foreground mb-1">Estimated File Size</p>
            <p className="text-3xl font-heading font-bold text-primary">{formatFileSize(fileSize)}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {isLossless
                ? `${sampleRate / 1000}kHz / ${bitDepth}-bit / ${channels === 1 ? 'Mono' : 'Stereo'}`
                : `${bitrate} kbps / ${channels === 1 ? 'Mono' : 'Stereo'}`
              }
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')} duration
            </p>
          </div>
        </div>
      </div>
    </ToolPage>
  );
};

export default BitrateCalculator;
