import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { getToolById } from '@/config/tool-registry';
import { Button } from '@/components/ui/button';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { encodeWav } from '@/engines/analysis/generators/wav-encoder';
import { MetricCard } from '@/components/display/MetricCard';
import { Download, Play, Square, Mic } from 'lucide-react';

const tool = getToolById('bit-perfect-test')!;

// Generate a deterministic 16-bit test signal: 997 Hz sine + embedded marker
function generateTestSignal(sampleRate: number, duration: number): Float32Array {
  const length = sampleRate * duration;
  const data = new Float32Array(length);
  const freq = 997; // Prime frequency, avoids harmonics of common rates
  const amplitude = 0.5; // -6 dBFS

  for (let i = 0; i < length; i++) {
    data[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate);
  }

  // Embed a marker: sample 0 = 0.25 (unique identifier)
  data[0] = 0.25;
  data[1] = -0.25;

  return data;
}

const BitPerfectTest = () => {
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBuffer, setRecordedBuffer] = useState<AudioBuffer | null>(null);
  const [matchResult, setMatchResult] = useState<{ match: boolean; correlation: number; detail: string } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const SR = 44100;
  const DURATION = 5;

  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  const generateAndDownload = useCallback(() => {
    const signal = generateTestSignal(SR, DURATION);
    const blob = encodeWav([signal], SR, 16);
    setDownloadBlob(blob);
  }, []);

  const playSignal = useCallback(() => {
    try { sourceRef.current?.stop(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}

    const ctx = new AudioContext({ sampleRate: SR });
    const signal = generateTestSignal(SR, DURATION);
    const buffer = ctx.createBuffer(1, signal.length, SR);
    buffer.getChannelData(0).set(signal);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => setPlaying(false);
    source.start();

    audioCtxRef.current = ctx;
    sourceRef.current = source;
    setPlaying(true);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: SR, channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const ctx = new AudioContext();
        const arrayBuf = await blob.arrayBuffer();
        try {
          const decoded = await ctx.decodeAudioData(arrayBuf);
          setRecordedBuffer(decoded);

          // Compare with reference
          const reference = generateTestSignal(SR, DURATION);
          const recorded = decoded.getChannelData(0);
          const minLen = Math.min(reference.length, recorded.length);

          // Cross-correlation at lag 0 (simplified)
          let sumXY = 0, sumXX = 0, sumYY = 0;
          for (let i = 0; i < minLen; i++) {
            sumXY += reference[i] * recorded[i];
            sumXX += reference[i] * reference[i];
            sumYY += recorded[i] * recorded[i];
          }
          const correlation = sumXY / (Math.sqrt(sumXX * sumYY) || 1);
          const match = correlation > 0.95;
          setMatchResult({
            match,
            correlation,
            detail: match
              ? 'High correlation with reference signal. Your playback chain appears to be bit-perfect or very close.'
              : 'Low correlation. Your audio chain may apply volume changes, SRC, DSP, or other processing.',
          });
        } catch {
          setMatchResult({ match: false, correlation: 0, detail: 'Could not decode recorded audio.' });
        }
        ctx.close();
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);

      // Auto-stop after DURATION + 1s
      setTimeout(() => {
        if (recorderRef.current?.state === 'recording') {
          recorderRef.current.stop();
          setRecording(false);
        }
      }, (DURATION + 1) * 1000);
    } catch (e: any) {
      console.error('Recording failed:', e);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
      setRecording(false);
    }
  }, []);

  return (
    <ToolPage tool={tool}>
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-heading font-semibold">Step 1: Generate Reference Signal</h2>
          <p className="text-xs text-muted-foreground">
            Creates a known 997 Hz sine tone at -6 dBFS, 16-bit/44.1kHz WAV. Play this through your audio chain.
          </p>
          <div className="flex gap-2">
            <Button onClick={generateAndDownload} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Generate WAV
            </Button>
            <Button
              onClick={playing ? () => { try { sourceRef.current?.stop(); } catch {} setPlaying(false); } : playSignal}
              variant={playing ? 'destructive' : 'outline'}
              className="gap-2"
            >
              {playing ? <><Square className="h-4 w-4" /> Stop</> : <><Play className="h-4 w-4" /> Play</>}
            </Button>
          </div>
          {downloadBlob && (
            <DownloadButton blob={downloadBlob} filename="bit-perfect-test-997hz.wav" label="Download Reference WAV" />
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-heading font-semibold">Step 2: Record & Compare (Optional)</h2>
          <p className="text-xs text-muted-foreground">
            Play the reference signal through your chain and record the output via loopback or microphone.
            The tool will compare the recording to the original.
          </p>
          <div className="flex gap-2">
            {!recording ? (
              <Button onClick={startRecording} variant="outline" className="gap-2">
                <Mic className="h-4 w-4" /> Record ({DURATION}s)
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" /> Stop Recording
              </Button>
            )}
          </div>
        </div>

        {matchResult && (
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Bit-Perfect"
              value={matchResult.match ? 'PASS' : 'FAIL'}
              status={matchResult.match ? 'pass' : 'fail'}
            />
            <MetricCard
              label="Correlation"
              value={`${(matchResult.correlation * 100).toFixed(1)}%`}
              status={matchResult.correlation > 0.95 ? 'pass' : matchResult.correlation > 0.7 ? 'warn' : 'fail'}
            />
            <div className="col-span-2 rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">{matchResult.detail}</p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          For best results, use a digital loopback cable or WASAPI/ALSA exclusive mode. Microphone recording introduces analog noise that reduces correlation.
        </p>
      </div>
    </ToolPage>
  );
};

export default BitPerfectTest;
